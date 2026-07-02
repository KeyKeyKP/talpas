import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { WorkEntry, ClientConfig, InvoiceMetadata } from './types';
import { izracunaj, izracunajUniverza, izracunajUL, formatNum } from './calculations';
import { getUlFakultete, ulNazivZaPrikaz, ulOrderRank } from './ulSpecifika';
import {
  IZDAJATELJ,
  DDV_STOPNJA,
  UNI_INTRO_UP,
  UNI_INTRO_UL,
  UNI_VZDRZEVANJE_OPIS_UP,
} from '../config/constants';

function eur(v: number) {
  return v.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Univerzitetni tok (UP/UL): deterministična SL oblika – pika za tisočice, vejica za decimalke.
// sl-SI locale NE grupira 4-mestnih števil (1200 → "1200,00"), zato grupiramo ročno: 1200 → "1.200,00".
function groupSl(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function eurSl(v: number): string {
  const neg = v < 0;
  const [i, d] = Math.abs(v).toFixed(2).split('.');
  return (neg ? '-' : '') + groupSl(i) + ',' + d;
}
function decSl(v: number): string {
  const neg = v < 0;
  const s = (Math.round(Math.abs(v) * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
  const [i, d] = s.split('.');
  return (neg ? '-' : '') + groupSl(i) + (d ? ',' + d : '');
}

function formatDateSl(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

async function loadTemplate(basePath: string, filename = 'template_racun.docx'): Promise<ArrayBuffer> {
  const res = await fetch(`${basePath}/assets/${filename}`);
  if (!res.ok) throw new Error(`Predloga ${filename} ni najdena (${res.status}). Naloži jo v public/assets/.`);
  return res.arrayBuffer();
}

function xmlEsc(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// .docx files created on Windows can have backslash paths in the ZIP entries.
// Docxtemplater looks up files with forward-slash paths (from Content_Types.xml),
// so backslash entries are never found and the template compiles to nothing.
function normalizeZipPaths(zip: PizZip): PizZip {
  Object.keys(zip.files).forEach(key => {
    if (key.includes('\\')) {
      const normalKey = key.split('\\').join('/');
      zip.files[normalKey] = zip.files[key];
      delete zip.files[key];
    }
  });
  return zip;
}

function buildFacultyAppendixXml(entries: WorkEntry[], isUL = false): string {
  // UL: prikaži polni naziv fakultete (npr. delovno "UL" → "Rektorat"). Za UP pusti delovno ime.
  const displayName = (s: string) => (isUL ? ulNazivZaPrikaz(s) : s);

  const grouped = new Map<string, WorkEntry[]>();
  for (const e of entries) {
    const key = e.stranka ?? 'Neznana';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }
  // Vrstni red priloge – enak kot postavke na 1. strani.
  // UL: Rektorat, UL Biomedicina, UL Statistika, UL Varstvo okolja, nato po abecedi.
  // UP: Rektorat prvi, ostale po abecedi.
  const jeRektoratKey = (k: string) => /rektorat/i.test(k);
  const byFakulteta = new Map<string, WorkEntry[]>(
    [...grouped.entries()].sort(([a], [b]) => {
      if (isUL) {
        const ra = ulOrderRank(a), rb = ulOrderRank(b);
        if (ra !== rb) return ra - rb;
        return displayName(a).localeCompare(displayName(b), 'sl');
      }
      const ar = jeRektoratKey(a), br = jeRektoratKey(b);
      if (ar !== br) return ar ? -1 : 1;
      return a.localeCompare(b, 'sl');
    })
  );

  // Exact table properties from standard template appendix
  const tblPr =
    '<w:tblPr>' +
    '<w:tblW w:w="11311" w:type="dxa"/>' +
    '<w:tblInd w:w="-497" w:type="dxa"/>' +
    '<w:tblLayout w:type="fixed"/>' +
    '<w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar>' +
    '</w:tblPr>';

  const tblGrid =
    '<w:tblGrid>' +
    '<w:gridCol w:w="1870"/><w:gridCol w:w="870"/><w:gridCol w:w="1200"/>' +
    '<w:gridCol w:w="1134"/><w:gridCol w:w="574"/><w:gridCol w:w="4387"/>' +
    '<w:gridCol w:w="1276"/>' +
    '</w:tblGrid>';

  const cols = [1870, 870, 1200, 1134, 574, 4387, 1276];
  const F = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>';

  // Header cell: italic, 8pt (sz 16), top+bottom border, vAlign=bottom.
  // Sprejme eno vrstico ali več vrstic (ločene z <w:br/>) – identično template prilogi.
  const hdrCell = (w: number, text: string | string[]) => {
    const lines = Array.isArray(text) ? text : [text];
    const iRPr = `<w:rPr>${F}<w:i/><w:iCs/><w:color w:val="000000"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>`;
    const runContent = lines
      .map((t, i) => (i ? '<w:br/>' : '') + `<w:t>${xmlEsc(t)}</w:t>`)
      .join('');
    return (
      `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>` +
      '<w:tcBorders>' +
      '<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
      '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
      '</w:tcBorders><w:vAlign w:val="bottom"/></w:tcPr>' +
      `<w:p><w:pPr>${iRPr}</w:pPr>` +
      `<w:r>${iRPr}${runContent}</w:r></w:p></w:tc>`
    );
  };

  // Data cell: no italic, bottom border only
  const dataCell = (w: number, text: string) =>
    `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>` +
    '<w:tcBorders><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr>' +
    `<w:p><w:pPr><w:rPr>${F}<w:color w:val="000000"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr>${F}<w:color w:val="000000"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>` +
    `<w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r></w:p></w:tc>`;

  // Summary cell: bCs, bottom border
  const sumCell = (w: number, text: string) =>
    `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>` +
    '<w:tcBorders><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr>' +
    `<w:p><w:pPr><w:rPr>${F}<w:bCs/><w:color w:val="000000"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:pPr>` +
    (text
      ? `<w:r><w:rPr>${F}<w:bCs/><w:color w:val="000000"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>` +
        `<w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r>`
      : '') +
    '</w:p></w:tc>';

  let xml = '';

  let fakIdx = 0;
  for (const [fakulteta, rows] of byFakulteta) {
    const skupajUrD = rows.filter(r => r.vrstaDela === 'D').reduce((s, r) => s + r.steviloUr, 0);

    // Prelom strani med fakultetami. Prva fakulteta pade takoj za obstoječi prelom
    // (za stranjo računa), zato zanjo NE dodamo dodatnega preloma (sicer prazna stran).
    if (fakIdx > 0) xml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    fakIdx++;

    // Naslov strani = SAMO ime fakultete (bold, 8pt = sz 16, enako kot tabela; isti zamik)
    const facRPr = `<w:rPr>${F}<w:b/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>`;
    const facPPr = `<w:pPr><w:pStyle w:val="Normal"/><w:ind w:start="-567" w:end="0"/>${facRPr}</w:pPr>`;
    xml += `<w:p>${facPPr}<w:r>${facRPr}<w:t>${xmlEsc(displayName(fakulteta))}</w:t></w:r></w:p>`;

    // Spacing paragraph (4pt, same as original)
    xml += '<w:p><w:pPr><w:rPr><w:sz w:val="8"/><w:szCs w:val="8"/></w:rPr></w:pPr></w:p>';

    // Header row (italic, top+bottom border). Brez fiksne višine – vrstica se prilagodi vsebini.
    const hdrRow =
      '<w:tr>' +
      hdrCell(cols[0], 'Delo') +
      hdrCell(cols[1], 'Datum') +
      hdrCell(cols[2], 'Kontakt') +
      hdrCell(cols[3], ['Vrsta dela', 'D=dodatno', 'V=vzdrževanje']) +
      hdrCell(cols[4], ['Število', 'ur']) +
      hdrCell(cols[5], 'Opis') +
      hdrCell(cols[6], 'Opravil') +
      '</w:tr>';

    // Data rows (bottom border only). Brez fiksne višine – vrstica sledi količini besedila.
    const dataRows = rows.map(e =>
      '<w:tr>' +
      dataCell(cols[0], e.delo ?? '') +
      dataCell(cols[1], formatObdobje(e.datumStr ?? formatDateSl(e.datum))) +
      dataCell(cols[2], e.kontakt ?? '') +
      dataCell(cols[3], e.vrstaDela === 'Dp' ? 'D po ponudbi' : (e.vrstaDela ?? '')) +
      dataCell(cols[4], decSl(e.steviloUr)) +
      dataCell(cols[5], e.opis ?? '') +
      dataCell(cols[6], e.opravil ?? '') +
      '</w:tr>'
    ).join('');

    // Summary row (bCs style): "SKUPAJ za obračun" + število ur. Brez fiksne višine.
    const sumRow =
      '<w:tr>' +
      sumCell(cols[0], 'SKUPAJ za obračun') +
      sumCell(cols[1], '') +
      sumCell(cols[2], '') +
      sumCell(cols[3], '') +
      sumCell(cols[4], decSl(skupajUrD)) +
      sumCell(cols[5], '') +
      sumCell(cols[6], '') +
      '</w:tr>';

    xml += `<w:tbl>${tblPr}${tblGrid}${hdrRow}${dataRows}${sumRow}</w:tbl>`;

    // Spacing after table
    xml += '<w:p><w:pPr><w:rPr><w:sz w:val="8"/><w:szCs w:val="8"/></w:rPr></w:pPr></w:p>';
  }

  return xml;
}

export async function generateDocx(
  entries: WorkEntry[],
  client: ClientConfig,
  metadata: InvoiceMetadata,
  basePath = '/talpas'
): Promise<void> {
  // 1. Fetch template
  const response = await fetch(`${basePath}/assets/template_racun.docx`);
  if (!response.ok) {
    console.error('FETCH FAILED:', response.status, response.url);
    throw new Error(`Predloga template_racun.docx ni najdena (${response.status}).`);
  }
  const arrayBuffer = await response.arrayBuffer();
  console.log('FETCH OK, size:', arrayBuffer.byteLength);

  // 2. Odpri z PizZip in normaliziraj poti (Windows .docx ima backslash poti)
  const zip = normalizeZipPaths(new PizZip(arrayBuffer));

  // 3. Ustvari Docxtemplater
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // 4. Pripravi podatke
  const calc = izracunaj(entries, client, metadata.znesekVzdrzevanja, metadata.znesekGostovanja);

  const postavke = [];
  if (calc.znesekVzdrzevanja > 0) {
    postavke.push({
      opis: metadata.opisVzdrzevanja || 'Vzdrževanje po Pogodbi o vzdrževanju IT opreme',
      kolicina: '1',
      enota: 'kos',
      cena: eur(calc.znesekVzdrzevanja),
      vrednostBrezDDV: eur(calc.znesekVzdrzevanja),
      stopnjaDDV: '22',
      ddv: eur(calc.ddvVzdrzevanje),
      vrednostZDDV: eur(calc.znesekVzdrzevanja + calc.ddvVzdrzevanje),
    });
  }
  if (calc.urDt > 0) {
    postavke.push({
      opis: 'Delo tehnik',
      kolicina: formatNum(calc.urDt),
      enota: 'ura',
      cena: eur(client.cenaDt),
      vrednostBrezDDV: eur(calc.vrednostDt),
      stopnjaDDV: '22',
      ddv: eur(calc.ddvDt),
      vrednostZDDV: eur(calc.vrednostDt + calc.ddvDt),
    });
  }
  if (calc.urDi > 0) {
    postavke.push({
      opis: 'Delo inženir',
      kolicina: formatNum(calc.urDi),
      enota: 'ura',
      cena: eur(client.cenaDi),
      vrednostBrezDDV: eur(calc.vrednostDi),
      stopnjaDDV: '22',
      ddv: eur(calc.ddvDi),
      vrednostZDDV: eur(calc.vrednostDi + calc.ddvDi),
    });
  }
  if (calc.vrednostDp > 0) {
    postavke.push({
      opis: 'Delo po ponudbi',
      kolicina: '1',
      enota: 'kos',
      cena: eur(calc.vrednostDp),
      vrednostBrezDDV: eur(calc.vrednostDp),
      stopnjaDDV: '22',
      ddv: eur(calc.ddvDp),
      vrednostZDDV: eur(calc.vrednostDp + calc.ddvDp),
    });
  }

  const sortedEntries = [...entries].sort((a, b) => b.datum.getTime() - a.datum.getTime());
  const isUmbrella = client.billingType === 'umbrella';

  const prilogaSekcije: { naslov: string; vrstice: object[]; skupajUrDt: string; skupajUrDi: string }[] = [];
  if (isUmbrella) {
    const byStranka: Record<string, WorkEntry[]> = {};
    for (const e of sortedEntries) {
      if (!byStranka[e.stranka]) byStranka[e.stranka] = [];
      byStranka[e.stranka].push(e);
    }
    for (const [stranka, rows] of Object.entries(byStranka)) {
      const dtUr = rows.filter(r => r.vrstaDela === 'Dt' && !r.jeVkljucena && !r.jePodPragom).reduce((s, r) => s + r.steviloUr, 0);
      const diUr = rows.filter(r => r.vrstaDela === 'Di' && !r.jeVkljucena && !r.jePodPragom).reduce((s, r) => s + r.steviloUr, 0);
      prilogaSekcije.push({
        naslov: stranka ?? '',
        vrstice: rows.map(e => ({
          delo: e.delo ?? '',
          datum: formatDateSl(e.datum),
          kontakt: e.kontakt ?? '',
          vrstaDela: e.jeVkljucena && e.vrstaDela !== 'V' ? 'V (vklj.)' : (e.vrstaDela ?? ''),
          steviloUr: formatNum(e.steviloUr),
          opis: e.opis ?? '',
          opravil: e.opravil ?? '',
        })),
        skupajUrDt: formatNum(dtUr),
        skupajUrDi: formatNum(diUr),
      });
    }
  }

  const prilogaVrstice = sortedEntries.map(e => ({
    delo: e.delo ?? '',
    datum: e.datumStr ?? formatDateSl(e.datum),
    kontakt: e.kontakt ?? '',
    vrstaDela: e.vrstaDela === null ? '–' : (e.jeVkljucena && e.vrstaDela !== 'V' ? 'V (vklj.)' : e.vrstaDela),
    steviloUr: formatNum(e.steviloUr),
    opis: e.opis ?? '',
    opravil: e.opravil ?? '',
  }));

  const data = {
    izdajatelj_ime: IZDAJATELJ.ime ?? '',
    izdajatelj_naslov: IZDAJATELJ.naslov ?? '',
    izdajatelj_idDDV: IZDAJATELJ.idDDV ?? '',
    izdajatelj_iban: IZDAJATELJ.iban ?? '',
    izdajatelj_swift: IZDAJATELJ.swift ?? '',
    izdajatelj_maticna: IZDAJATELJ.maticnaSt ?? '',
    izdajatelj_email: IZDAJATELJ.email ?? '',
    izdajatelj_web: IZDAJATELJ.web ?? '',
    izdala: IZDAJATELJ.izdala ?? '',

    imeStranke: client.imeNaRacunu ?? '',
    naslovStranke: client.naslov ?? '',
    postaStranke: client.posta ?? '',
    krajStranke: client.kraj ?? '',
    idDDV: client.idDDV ?? '',

    stevilkaRacuna: metadata.stevilkaRacuna ?? '',
    // Template že vsebuje "Sklic: SI 00 {sklic}" – zato tu podamo SAMO številko (brez "SI 00" prefiksa).
    sklic: metadata.stevilkaRacuna ?? '',
    // Datumi v slovenski obliki s pikami (d.M.yyyy), npr. "2.7.2026" (ne "02/07/2026").
    datumRacuna: formatObdobje(metadata.datumRacuna ?? ''),
    rokPlacila: formatObdobje(metadata.rokPlacila ?? ''),
    obdobjeOd: formatObdobje(metadata.obdobjeOd ?? ''),
    obdobjeDo: formatObdobje(metadata.obdobjeDo ?? ''),

    opisVzdrzevanja: (metadata.opisVzdrzevanja || 'Vzdrževanje po Pogodbi o vzdrževanju IT opreme') ?? '',
    znesekVzdrzevanja: eur(calc.znesekVzdrzevanja),
    ddvVzdrzevanje: eur(calc.ddvVzdrzevanje),
    vzdrzevanjeZDDV: eur(calc.znesekVzdrzevanja + calc.ddvVzdrzevanje),

    urDt: formatNum(calc.urDt),
    cenaDt: eur(client.cenaDt),
    vrednostDt: eur(calc.vrednostDt),
    ddvDt: eur(calc.ddvDt),
    dtZDDV: eur(calc.vrednostDt + calc.ddvDt),

    urDi: formatNum(calc.urDi),
    cenaDi: eur(client.cenaDi),
    vrednostDi: eur(calc.vrednostDi),
    ddvDi: eur(calc.ddvDi),
    diZDDV: eur(calc.vrednostDi + calc.ddvDi),

    vrednostDp: eur(calc.vrednostDp),
    ddvDp: eur(calc.ddvDp),
    dpZDDV: eur(calc.vrednostDp + calc.ddvDp),

    skupajBrezDDV: eur(calc.skupajBrezDDV),
    skupajDDV: eur(calc.ddv),
    skupajZDDV: eur(calc.skupajZDDV),
    skupajZaPlacilo: eur(calc.skupajZDDV),

    postavke,

    vzdrzevanjeArr: calc.znesekVzdrzevanja > 0 ? [{
      opisVzdrzevanja: metadata.opisVzdrzevanja || 'Vzdrževanje po Pogodbi o vzdrževanju IT opreme',
      znesekVzdrzevanja: eur(calc.znesekVzdrzevanja),
      ddvVzdrzevanje: eur(calc.ddvVzdrzevanje),
      vzdrzevanjeZDDV: eur(calc.znesekVzdrzevanja + calc.ddvVzdrzevanje),
    }] : [],

    dtArr: calc.urDt > 0 ? [{
      urDt: formatNum(calc.urDt),
      cenaDt: eur(client.cenaDt),
      vrednostDt: eur(calc.vrednostDt),
      ddvDt: eur(calc.ddvDt),
      dtZDDV: eur(calc.vrednostDt + calc.ddvDt),
    }] : [],

    diArr: calc.urDi > 0 ? [{
      urDi: formatNum(calc.urDi),
      cenaDi: eur(client.cenaDi),
      vrednostDi: eur(calc.vrednostDi),
      ddvDi: eur(calc.ddvDi),
      diZDDV: eur(calc.vrednostDi + calc.ddvDi),
    }] : [],

    gostovanjeArr: calc.znesekGostovanja > 0 ? [{
      znesekGostovanja: eur(calc.znesekGostovanja),
      ddvGostovanja: eur(calc.ddvGostovanje),
      gostovanjeZDDV: eur(calc.znesekGostovanja + calc.ddvGostovanje),
    }] : [],

    dpArr: calc.vrednostDp > 0 ? [{
      vrednostDp: eur(calc.vrednostDp),
      ddvDp: eur(calc.ddvDp),
      dpZDDV: eur(calc.vrednostDp + calc.ddvDp),
    }] : [],

    prilogaStevilka: metadata.stevilkaRacuna ?? '',
    priloga: prilogaVrstice,
    prilogaVrstice,
    isUmbrella,
    prilogaSekcije,
    skupajUrDt: formatNum(calc.urDt),
    skupajUrDi: formatNum(calc.urDi),
  };

  // 5. RENDERAJ
  console.log('RENDER DATA:', Object.keys(data));
  console.log('imeStranke:', data.imeStranke, '| stevilkaRacuna:', data.stevilkaRacuna);
  try {
    doc.render(data);
    console.log('RENDER OK');
  } catch (error: unknown) {
    const e = error as { properties?: { errors?: unknown }; message?: string };
    console.error('RENDER FAILED:', e.message);
    if (e.properties?.errors) {
      console.error('ERRORS:', JSON.stringify(e.properties.errors, null, 2));
    }
    throw error;
  }

  // 6. Stranka brez vnosov (samo mesečni pavšal): odstrani prilogo in prelom strani pred njo,
  //    da račun vsebuje SAMO vrstico vzdrževanja (brez prazne priloge). Naslov priloge je v
  //    predlogi statičen (zunaj {#priloga} zanke), zato ga je treba izrezati programsko.
  const outZip = doc.getZip();
  if (sortedEntries.length === 0) {
    let docXml = outZip.files['word/document.xml'].asText();
    // Odstrani edini prelom strani (pred prilogo)
    docXml = docXml.replace(/<w:r\b[^>]*>\s*<w:br w:type="page"\/>\s*<\/w:r>/, '');
    // Odstrani prilogo: od odstavka z naslovom "Priloga ra…" do <w:sectPr>
    const headIdx = docXml.indexOf('Priloga ra');
    const sectStart = docXml.lastIndexOf('<w:sectPr');
    if (headIdx !== -1 && sectStart !== -1 && headIdx < sectStart) {
      const paraOpen = /<w:p(?:>|\s)/g;
      let paraStart = -1;
      let m: RegExpExecArray | null;
      while ((m = paraOpen.exec(docXml)) !== null && m.index < headIdx) paraStart = m.index;
      if (paraStart !== -1) {
        docXml = docXml.substring(0, paraStart) + docXml.substring(sectStart);
      }
    }
    outZip.file('word/document.xml', docXml);
  }

  // 7. Generiraj blob ŠELE PO renderju
  const blob = outZip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  // 8. Shrani
  saveAs(blob, `Racun_${metadata.stevilkaRacuna}_${client.id}.docx`);
}

// Reformat obdobje string (dd/mm/yyyy, d.m.yyyy, ...) → d.M.yyyy (npr. "1.5.2026")
function formatObdobje(s: string): string {
  const m = (s ?? '').trim().match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (!m) return s ?? '';
  return `${parseInt(m[1], 10)}.${parseInt(m[2], 10)}.${m[3]}`;
}

export async function generateUniversityInvoice(
  entries: WorkEntry[],
  client: ClientConfig,
  metadata: InvoiceMetadata,
  uniType: 'UP' | 'UL' = 'UP',
  basePath = '/talpas'
): Promise<void> {
  const calc = izracunajUniverza(entries, client.cenaDt, metadata.znesekVzdrzevanja);
  const templateBuffer = await loadTemplate(basePath, 'template_racun_uni.docx');

  const isUL = uniType === 'UL';

  // Uni-only lokalni formatterji: SL denar/ure s piko za tisočice (1.200,00) in evropski datumi.
  // Senčijo modulske eur/dec/formatNum SAMO znotraj te funkcije – standardni tok ostane nedotaknjen.
  const eur = eurSl;
  const dec = decSl;
  const formatNum = decSl;

  type Postavka = {
    opis: string; kolicina: string; enota: string; cena: string;
    vrednostBrezDDV: string; stopnjaDDV: string; ddv: string; vrednostZDDV: string;
  };
  const postavke: Postavka[] = [];

  // Skupni seštevki – za UL iz UL_specifika, za UP iz izracunajUniverza.
  let totalBrezDDV = calc.skupajBrezDDV;
  let totalDDV = calc.ddv;
  let totalZDDV = calc.skupajZDDV;

  const emptyAmounts = { kolicina: '', enota: '', cena: '', vrednostBrezDDV: '', stopnjaDDV: '', ddv: '', vrednostZDDV: '' };

  if (isUL) {
    // ── UL: postavke iz UL_specifika (vse fakultete), delo/Dp iz delovnih podatkov ──
    const ulFakultete = getUlFakultete();
    if (ulFakultete.length === 0) {
      throw new Error('UL specifika ni naložena (public/assets/UL_specifika.xlsx). Osveži stran in poskusi znova.');
    }
    const ulCalc = izracunajUL(entries, ulFakultete, client.cenaDt);

    for (const f of ulCalc.fakultete) {
      // Vrstica 1: osnovno vzdrževanje – VEDNO. Če fakulteta nima mesečnega zneska,
      // se izpiše samo postavka (prazni zneski, za ročni vpis).
      const imaZnesek = f.vzdrzevanje != null;
      postavke.push({
        opis: `Osnovno vzdrževanje in podpora ${f.kratica}`,
        ...emptyAmounts,
        ...(imaZnesek ? {
          kolicina: '1',
          enota: 'kos',
          cena: eur(f.vzdrzevanje as number),
          vrednostBrezDDV: eur(f.vzdrzevanje as number),
          stopnjaDDV: '22',
          ddv: eur((f.vzdrzevanje as number) * DDV_STOPNJA),
          vrednostZDDV: eur((f.vzdrzevanje as number) * (1 + DDV_STOPNJA)),
        } : {}),
      });

      // Vrstica 2: delo in nadgradnje – VEDNO prisotna; prazna, če ni D ur (za ročni vpis)
      const imaUre = f.urD > 0;
      postavke.push({
        opis: `Delo in nadgradnje po naročilu in specifikaciji ${f.kratica}`,
        ...emptyAmounts,
        ...(imaUre ? {
          kolicina: formatNum(f.urD),
          enota: 'ur',
          cena: eur(client.cenaDt),
          vrednostBrezDDV: eur(f.vrednostD),
          stopnjaDDV: '22',
          ddv: eur(f.vrednostD * DDV_STOPNJA),
          vrednostZDDV: eur(f.vrednostD * (1 + DDV_STOPNJA)),
        } : {}),
      });

      // Vrstica 3: nadgradnja po ponudbi – SAMO če ima fakulteta Dp postavke
      if (f.dp.length > 0) {
        const opisi = f.dp.map(d => d.opis).filter(Boolean).join('; ');
        const imaZnesek = f.dpZnesek > 0;
        postavke.push({
          opis: `D po ponudbi ${f.kratica}${opisi ? ': ' + opisi : ''}`,
          ...emptyAmounts,
          kolicina: '1',
          enota: 'kos',
          ...(imaZnesek ? {
            cena: eur(f.dpZnesek),
            vrednostBrezDDV: eur(f.dpZnesek),
            stopnjaDDV: '22',
            ddv: eur(f.dpZnesek * DDV_STOPNJA),
            vrednostZDDV: eur(f.dpZnesek * (1 + DDV_STOPNJA)),
          } : {}),
        });
      }
    }

    totalBrezDDV = ulCalc.skupajBrezDDV;
    totalDDV = ulCalc.ddv;
    totalZDDV = ulCalc.skupajZDDV;
  } else {
    // ── UP: vzdrževanje + Rektorat + vse fakultete (prazne, če ni ur) + Dp ──
    const fakulteteZDelom = calc.poFakultetah.filter(f => f.urD > 0 || f.dpZnesek > 0);

    if (calc.znesekVzdrzevanja > 0) {
      postavke.push({
        opis: UNI_VZDRZEVANJE_OPIS_UP,
        kolicina: '1',
        enota: 'kos',
        cena: eur(calc.znesekVzdrzevanja),
        vrednostBrezDDV: eur(calc.znesekVzdrzevanja),
        stopnjaDDV: '22',
        ddv: eur(calc.znesekVzdrzevanja * DDV_STOPNJA),
        vrednostZDDV: eur(calc.znesekVzdrzevanja * (1 + DDV_STOPNJA)),
      });
    }

    const jeRektorat = (ime: string) => /rektorat/i.test(ime);
    const vseFakultete = [
      ...calc.poFakultetah.filter(f => jeRektorat(f.fakulteta)),
      ...calc.poFakultetah.filter(f => !jeRektorat(f.fakulteta)),
    ];
    for (const { fakulteta, urD } of vseFakultete) {
      const opis = jeRektorat(fakulteta)
        ? 'Delo in nadgradnje po naročilu in specifikaciji (Rektorat in skupna naročila za vse članice)'
        : `Delo in nadgradnje po naročilu in specifikaciji (${fakulteta})`;
      const imaUre = urD > 0;
      const vrednost = urD * client.cenaDt;
      postavke.push({
        opis,
        ...emptyAmounts,
        ...(imaUre ? {
          kolicina: formatNum(urD),
          enota: 'ur',
          cena: eur(client.cenaDt),
          vrednostBrezDDV: eur(vrednost),
          stopnjaDDV: '22',
          ddv: eur(vrednost * DDV_STOPNJA),
          vrednostZDDV: eur(vrednost * (1 + DDV_STOPNJA)),
        } : {}),
      });
    }

    for (const { fakulteta, dpZnesek } of fakulteteZDelom) {
      if (dpZnesek > 0) {
        postavke.push({
          opis: `D po ponudbi ${fakulteta}`,
          kolicina: '1',
          enota: 'kos',
          cena: eur(dpZnesek),
          vrednostBrezDDV: eur(dpZnesek),
          stopnjaDDV: '22',
          ddv: eur(dpZnesek * DDV_STOPNJA),
          vrednostZDDV: eur(dpZnesek * (1 + DDV_STOPNJA)),
        });
      }
    }
  }

  const sortedEntries = [...entries].sort((a, b) => b.datum.getTime() - a.datum.getTime());
  const obdobjeOd = formatObdobje(metadata.obdobjeOd ?? '');
  const obdobjeDo = formatObdobje(metadata.obdobjeDo ?? '');

  const uniData = {
    izdajatelj_ime: IZDAJATELJ.ime ?? '',
    izdajatelj_naslov: IZDAJATELJ.naslov ?? '',
    izdajatelj_idDDV: IZDAJATELJ.idDDV ?? '',
    izdajatelj_iban: IZDAJATELJ.iban ?? '',
    izdajatelj_swift: IZDAJATELJ.swift ?? '',
    izdajatelj_maticna: IZDAJATELJ.maticnaSt ?? '',
    izdajatelj_email: IZDAJATELJ.email ?? '',
    izdajatelj_web: IZDAJATELJ.web ?? '',
    izdala: IZDAJATELJ.izdala ?? '',

    imeStranke: client.imeNaRacunu ?? '',
    naslovStranke: client.naslov ?? '',
    postaStranke: client.posta ?? '',
    krajStranke: client.kraj ?? '',
    idDDV: client.idDDV ?? '',

    stevilkaRacuna: metadata.stevilkaRacuna ?? '',
    sklic: metadata.stevilkaRacuna ?? '',
    datumRacuna: formatObdobje(metadata.datumRacuna ?? ''),
    rokPlacila: formatObdobje(metadata.rokPlacila ?? ''),
    obdobjeOd,
    obdobjeDo,

    opisVzdrzevanja: (metadata.opisVzdrzevanja || 'Vzdrževanje po pogodbi') ?? '',
    znesekVzdrzevanja: eur(calc.znesekVzdrzevanja),
    ddvVzdrzevanje: eur(calc.znesekVzdrzevanja * DDV_STOPNJA),
    vzdrzevanjeZDDV: eur(calc.znesekVzdrzevanja * (1 + DDV_STOPNJA)),

    // urDt/urDi placeholders: map D→Dt for template compatibility
    urDt: formatNum(calc.urD),
    cenaDt: eur(client.cenaDt),
    vrednostDt: eur(calc.vrednostD),
    ddvDt: eur(calc.vrednostD * DDV_STOPNJA),
    dtZDDV: eur(calc.vrednostD * (1 + DDV_STOPNJA)),

    urDi: '0,00',
    cenaDi: eur(0),
    vrednostDi: eur(0),
    ddvDi: eur(0),
    diZDDV: eur(0),

    vrednostDp: eur(calc.vrednostDp),
    ddvDp: eur(calc.vrednostDp * DDV_STOPNJA),
    dpZDDV: eur(calc.vrednostDp * (1 + DDV_STOPNJA)),

    skupajBrezDDV: eur(totalBrezDDV),
    skupajDDV: eur(totalDDV),
    skupajZDDV: eur(totalZDDV),
    skupajZaPlacilo: eur(totalZDDV),

    postavke,

    vzdrzevanjeArr: calc.znesekVzdrzevanja > 0 ? [{
      opisVzdrzevanja: metadata.opisVzdrzevanja || 'Vzdrževanje po pogodbi',
      znesekVzdrzevanja: eur(calc.znesekVzdrzevanja),
      ddvVzdrzevanje: eur(calc.znesekVzdrzevanja * DDV_STOPNJA),
      vzdrzevanjeZDDV: eur(calc.znesekVzdrzevanja * (1 + DDV_STOPNJA)),
    }] : [],
    dtArr: calc.urD > 0 ? [{
      urDt: dec(calc.urD),
      cenaDt: eur(client.cenaDt),
      vrednostDt: eur(calc.vrednostD),
      ddvDt: eur(calc.vrednostD * DDV_STOPNJA),
      dtZDDV: eur(calc.vrednostD * (1 + DDV_STOPNJA)),
    }] : [],
    diArr: [],
    gostovanjeArr: [],
    dpArr: calc.vrednostDp > 0 ? [{
      vrednostDp: eur(calc.vrednostDp),
      ddvDp: eur(calc.vrednostDp * DDV_STOPNJA),
      dpZDDV: eur(calc.vrednostDp * (1 + DDV_STOPNJA)),
    }] : [],

    prilogaStevilka: metadata.stevilkaRacuna ?? '',
    // Appendix is built programmatically per-faculty — pass empty to suppress template loop
    priloga: [],
    skupajUrDt: dec(calc.urD),
    skupajUrDi: '0',
  };
  console.log('TEMPLATE DATA (uni):', JSON.stringify(uniData, null, 2));
  console.log('=== UNI WORD DATA ===');
  console.log('imeStranke:', uniData.imeStranke);
  console.log('vzdrzevanjeArr:', JSON.stringify(uniData.vzdrzevanjeArr));
  console.log('dtArr:', JSON.stringify(uniData.dtArr));
  console.log('diArr:', JSON.stringify(uniData.diArr));
  console.log('dpArr:', JSON.stringify(uniData.dpArr));
  console.log('priloga:', JSON.stringify(uniData.priloga?.slice(0,2)));
  console.log('skupajBrezDDV:', uniData.skupajBrezDDV);
  console.log('FULL DATA KEYS:', Object.keys(uniData));
  const zip = normalizeZipPaths(new PizZip(templateBuffer));

  // Besedilo nad tabelo računa (ločeno za UP/UL). Zamenjaj pred renderjem, da se
  // {obdobjeOd}/{obdobjeDo} znotraj besedila normalno nadomestita.
  const introText = isUL ? UNI_INTRO_UL : UNI_INTRO_UP;
  const introDocXml = zip.files['word/document.xml'].asText().replace(
    /Račun za opravljene storitve v obdobju \{obdobjeOd\} do \{obdobjeDo\}\.\s*/,
    () => xmlEsc(introText)
  );
  zip.file('word/document.xml', introDocXml);

  try {
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(uniData);

    // Inject per-faculty appendix pages into rendered XML
    const renderedZip = doc.getZip();
    let docXml = renderedZip.files['word/document.xml'].asText();

    // Preserve sectPr (page margins, header/footer references) — must stay at end of body
    const sectPrStart = docXml.lastIndexOf('<w:sectPr');
    const sectPrEnd = docXml.lastIndexOf('</w:sectPr>') + '</w:sectPr>'.length;
    const sectPr = sectPrStart !== -1 ? docXml.substring(sectPrStart, sectPrEnd) : '';

    // Replace the ENTIRE template appendix (heading + template table) with per-faculty pages,
    // tako da imajo vse fakultete isto (programatsko) tabelo z enakim headerjem.
    // Docxtemplater po renderju doda xml:space, zato NE iščemo '<w:t>Priloga ra', ampak samo besedilo,
    // začetek odstavka pa določimo z regexom (da ne zadanemo <w:pPr>).
    const appendixTextIdx = docXml.indexOf('Priloga ra');
    let paraStart = -1;
    if (appendixTextIdx !== -1) {
      const paraOpen = /<w:p(?:>|\s)/g;
      let m: RegExpExecArray | null;
      while ((m = paraOpen.exec(docXml)) !== null && m.index < appendixTextIdx) {
        paraStart = m.index;
      }
    }
    const facultyXml = buildFacultyAppendixXml(sortedEntries, isUL);
    if (paraStart !== -1) {
      docXml = docXml.substring(0, paraStart) + facultyXml + '<w:p/>' + sectPr + '</w:body></w:document>';
    } else {
      // Fallback: inject before sectPr
      const cutAt = sectPrStart !== -1 ? sectPrStart : docXml.lastIndexOf('</w:body>');
      const tail = sectPrStart !== -1 ? sectPr + '</w:body></w:document>' : '</w:body></w:document>';
      docXml = docXml.substring(0, cutAt) + facultyXml + '<w:p/>' + tail;
    }

    renderedZip.file('word/document.xml', docXml);
    const blob = renderedZip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, `Racun_${metadata.stevilkaRacuna}_${client.id}.docx`);
  } catch (error: unknown) {
    const e = error as { properties?: { errors?: unknown }; message?: string };
    console.error('Docx error (uni):', e.message);
    if (e.properties?.errors) {
      console.error('Template errors (uni):', JSON.stringify(e.properties.errors, null, 2));
    }
    throw error;
  }
}

// VIS: per-faculty invoice using standard template, D hours mapped to Dt
export async function generateVisInvoice(
  entries: WorkEntry[],
  client: ClientConfig,
  metadata: InvoiceMetadata,
  basePath = '/talpas'
): Promise<void> {
  const mappedEntries: WorkEntry[] = entries.map(e => ({
    ...e,
    vrstaDela: e.vrstaDela === 'D' ? 'Dt' : e.vrstaDela,
  }));
  return generateDocx(mappedEntries, client, metadata, basePath);
}

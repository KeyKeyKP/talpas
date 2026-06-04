import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { WorkEntry, ClientConfig, InvoiceMetadata } from './types';
import { izracunaj, izracunajUniverza, formatNum } from './calculations';
import { IZDAJATELJ, DDV_STOPNJA } from '../config/constants';

function eur(v: number) {
  return v.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format hours/quantities without trailing zeros: 7.5 → "7,5", 2.0 → "2", 7.25 → "7,25"
function dec(v: number) {
  return v.toLocaleString('sl-SI', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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

function buildFacultyAppendixXml(entries: WorkEntry[], stevilkaRacuna: string): string {
  const byFakulteta = new Map<string, WorkEntry[]>();
  for (const e of entries) {
    const key = e.stranka ?? 'Neznana';
    if (!byFakulteta.has(key)) byFakulteta.set(key, []);
    byFakulteta.get(key)!.push(e);
  }

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

  // Header cell: italic, top+bottom border, vAlign=bottom
  const hdrCell = (w: number, text: string) =>
    `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>` +
    '<w:tcBorders>' +
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '</w:tcBorders><w:vAlign w:val="bottom"/></w:tcPr>' +
    `<w:p><w:pPr><w:rPr>${F}<w:i/><w:iCs/><w:color w:val="000000"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr>${F}<w:i/><w:iCs/><w:color w:val="000000"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>` +
    `<w:t>${xmlEsc(text)}</w:t></w:r></w:p></w:tc>`;

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

  // Title paragraph style (same as standard: bold, sz=22, ind=-567)
  const titleRPr = `<w:rPr>${F}<w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>`;
  const titlePPr = `<w:pPr><w:pStyle w:val="Normal"/><w:ind w:start="-567" w:end="0"/>${titleRPr}</w:pPr>`;

  let xml = '';

  for (const [fakulteta, rows] of byFakulteta) {
    const skupajUrD = rows.filter(r => r.vrstaDela === 'D').reduce((s, r) => s + r.steviloUr, 0);

    // Page break
    xml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

    // Title: "Priloga računa št. XXXX"
    xml += `<w:p>${titlePPr}<w:r>${titleRPr}<w:t>Priloga računa št. ${xmlEsc(stevilkaRacuna)}</w:t></w:r></w:p>`;

    // Faculty name (bold, sz=20, same indent)
    const facRPr = `<w:rPr>${F}<w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>`;
    const facPPr = `<w:pPr><w:pStyle w:val="Normal"/><w:ind w:start="-567" w:end="0"/>${facRPr}</w:pPr>`;
    xml += `<w:p>${facPPr}<w:r>${facRPr}<w:t>${xmlEsc(fakulteta)}</w:t></w:r></w:p>`;

    // Spacing paragraph (4pt, same as original)
    xml += '<w:p><w:pPr><w:rPr><w:sz w:val="8"/><w:szCs w:val="8"/></w:rPr></w:pPr></w:p>';

    // Header row (italic, top+bottom border, height 446)
    const hdrRow =
      '<w:tr><w:trPr><w:trHeight w:val="446"/></w:trPr>' +
      hdrCell(cols[0], 'Delo') +
      hdrCell(cols[1], 'Datum') +
      hdrCell(cols[2], 'Kontakt') +
      hdrCell(cols[3], 'Vrsta dela') +
      hdrCell(cols[4], 'Ur') +
      hdrCell(cols[5], 'Opis') +
      hdrCell(cols[6], 'Opravil') +
      '</w:tr>';

    // Data rows (bottom border only, height 594)
    const dataRows = rows.map(e =>
      '<w:tr><w:trPr><w:trHeight w:val="594"/></w:trPr>' +
      dataCell(cols[0], e.delo ?? '') +
      dataCell(cols[1], formatDateSl(e.datum)) +
      dataCell(cols[2], e.kontakt ?? '') +
      dataCell(cols[3], e.vrstaDela ?? '') +
      dataCell(cols[4], dec(e.steviloUr)) +
      dataCell(cols[5], e.opis ?? '') +
      dataCell(cols[6], e.opravil ?? '') +
      '</w:tr>'
    ).join('');

    // Summary row (height 70, bCs style)
    const sumRow =
      '<w:tr><w:trPr><w:trHeight w:val="70"/></w:trPr>' +
      sumCell(cols[0], 'Skupaj ur') +
      sumCell(cols[1], '') +
      sumCell(cols[2], '') +
      sumCell(cols[3], 'D') +
      sumCell(cols[4], dec(skupajUrD)) +
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

  // 2. Odpri z PizZip
  const zip = new PizZip(arrayBuffer);

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
    datum: formatDateSl(e.datum),
    kontakt: e.kontakt ?? '',
    vrstaDela: e.jeVkljucena && e.vrstaDela !== 'V' ? 'V (vklj.)' : (e.vrstaDela ?? ''),
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
    sklic: 'SI 00 ' + (metadata.stevilkaRacuna ?? ''),
    datumRacuna: metadata.datumRacuna ?? '',
    rokPlacila: metadata.rokPlacila ?? '',
    obdobjeOd: metadata.obdobjeOd ?? '',
    obdobjeDo: metadata.obdobjeDo ?? '',

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

  // 6. Generiraj blob ŠELE PO renderju
  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  // 7. Shrani
  saveAs(blob, `Racun_${metadata.stevilkaRacuna}_${client.id}.docx`);
}

export async function generateUniversityInvoice(
  entries: WorkEntry[],
  client: ClientConfig,
  metadata: InvoiceMetadata,
  basePath = '/talpas'
): Promise<void> {
  const calc = izracunajUniverza(entries, client.cenaDt, metadata.znesekVzdrzevanja);
  const templateBuffer = await loadTemplate(basePath, 'template_racun_uni.docx');

  // Per-faculty postavke (only faculties with D ur > 0)
  const fakulteteZDelom = calc.poFakultetah.filter(f => f.urD > 0 || f.dpZnesek > 0);

  const postavke = [];

  if (calc.znesekVzdrzevanja > 0) {
    postavke.push({
      opis: metadata.opisVzdrzevanja || 'Vzdrževanje po pogodbi',
      kolicina: '1',
      enota: 'kos',
      cena: eur(calc.znesekVzdrzevanja),
      vrednostBrezDDV: eur(calc.znesekVzdrzevanja),
      stopnjaDDV: '22',
      ddv: eur(calc.znesekVzdrzevanja * DDV_STOPNJA),
      vrednostZDDV: eur(calc.znesekVzdrzevanja * (1 + DDV_STOPNJA)),
    });
  }

  // "Delo {fakulteta}" for each faculty with D hours
  for (const { fakulteta, urD } of fakulteteZDelom) {
    if (urD > 0) {
      postavke.push({
        opis: `Delo ${fakulteta}`,
        kolicina: formatNum(urD),
        enota: 'ur',
        cena: eur(client.cenaDt),
        vrednostBrezDDV: eur(urD * client.cenaDt),
        stopnjaDDV: '22',
        ddv: eur(urD * client.cenaDt * DDV_STOPNJA),
        vrednostZDDV: eur(urD * client.cenaDt * (1 + DDV_STOPNJA)),
      });
    }
  }

  // "Delo po ponudbi {fakulteta}" for each faculty with Dp
  for (const { fakulteta, dpZnesek } of fakulteteZDelom) {
    if (dpZnesek > 0) {
      postavke.push({
        opis: `Delo po ponudbi ${fakulteta}`,
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

  const sortedEntries = [...entries].sort((a, b) => b.datum.getTime() - a.datum.getTime());

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
    datumRacuna: metadata.datumRacuna ?? '',
    rokPlacila: metadata.rokPlacila ?? '',
    obdobjeOd: metadata.obdobjeOd ?? '',
    obdobjeDo: metadata.obdobjeDo ?? '',

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

    skupajBrezDDV: eur(calc.skupajBrezDDV),
    skupajDDV: eur(calc.ddv),
    skupajZDDV: eur(calc.skupajZDDV),
    skupajZaPlacilo: eur(calc.skupajZDDV),

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
  const zip = new PizZip(templateBuffer);
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

    // Replace template appendix section (starts at "Priloga računa" paragraph) with per-faculty pages
    const appendixIdx = docXml.indexOf('<w:t>Priloga ra');
    const facultyXml = buildFacultyAppendixXml(sortedEntries, metadata.stevilkaRacuna ?? '');
    if (appendixIdx !== -1) {
      const paraStart = docXml.lastIndexOf('<w:p', appendixIdx);
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

import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle, ShadingType,
  PageBreak, Header, ImageRun, VerticalAlign, HeightRule,
  convertInchesToTwip, TableLayoutType,
} from 'docx';
import { saveAs } from 'file-saver';
import { WorkEntry, ClientConfig, InvoiceMetadata } from './types';
import { izracunaj, formatNum } from './calculations';
import { IZDAJATELJ, DDV_STOPNJA } from '../config/constants';

const YELLOW = 'FFFF00';
const LIGHT_GRAY = 'F2F2F2';
const DARK = '1F2937';

function cell(text: string, opts?: {
  bold?: boolean; shade?: string; align?: 'left' | 'right' | 'center';
  color?: string; size?: number; colspan?: number; rowspan?: number;
}): TableCell {
  return new TableCell({
    children: [new Paragraph({
      alignment: opts?.align === 'right' ? AlignmentType.RIGHT
        : opts?.align === 'center' ? AlignmentType.CENTER
        : AlignmentType.LEFT,
      children: [new TextRun({
        text,
        bold: opts?.bold,
        color: opts?.color ?? '000000',
        size: opts?.size ?? 18,
      })],
    })],
    shading: opts?.shade ? { type: ShadingType.CLEAR, fill: opts.shade } : undefined,
    columnSpan: opts?.colspan,
    rowSpan: opts?.rowspan,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

function eur(v: number) {
  return v.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateSl(d: Date) {
  return d.toLocaleDateString('sl-SI');
}

function headerRow(labels: string[]) {
  return new TableRow({
    tableHeader: true,
    children: labels.map(l => cell(l, { bold: true, shade: LIGHT_GRAY, align: 'center' })),
    height: { value: 350, rule: HeightRule.ATLEAST },
  });
}

async function loadImageBuffer(path: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function generateDocx(
  entries: WorkEntry[],
  client: ClientConfig,
  metadata: InvoiceMetadata,
  basePath: string = '/talpas'
): Promise<void> {
  const calc = izracunaj(entries, client, metadata.znesekVzdrzevanja);

  const logoBuffer = await loadImageBuffer(`${basePath}/assets/talpas-logo.jpg`);
  const stampBuffer = await loadImageBuffer(`${basePath}/assets/talpas-stamp.png`);
  const footerBuffer = await loadImageBuffer(`${basePath}/assets/talpas-footer.jpg`);

  // === PAGE 1: RACUN ===
  const invoiceRows: TableRow[] = [
    headerRow(['Opis', 'Kol.', 'Enota', 'Vrednost/enoto', 'Vrednost brez DDV', 'St. DDV', 'DDV', 'Vrednost z DDV']),
  ];

  if (calc.znesekVzdrzevanja > 0) {
    invoiceRows.push(new TableRow({ children: [
      cell(metadata.opisVzdrzevanja || 'Vzdrževanje po Pogodbi o vzdrževanju IT opreme'),
      cell('1', { align: 'right' }),
      cell('kos'),
      cell(eur(calc.znesekVzdrzevanja), { align: 'right' }),
      cell(eur(calc.znesekVzdrzevanja), { align: 'right' }),
      cell('22', { align: 'right' }),
      cell(eur(calc.ddvVzdrzevanje), { align: 'right' }),
      cell(eur(calc.znesekVzdrzevanja + calc.ddvVzdrzevanje), { align: 'right' }),
    ]}));
  }
  if (calc.urDt > 0) {
    invoiceRows.push(new TableRow({ children: [
      cell('Delo tehnik'),
      cell(formatNum(calc.urDt), { align: 'right' }),
      cell('ura'),
      cell(eur(client.cenaDt), { align: 'right' }),
      cell(eur(calc.vrednostDt), { align: 'right' }),
      cell('22', { align: 'right' }),
      cell(eur(calc.ddvDt), { align: 'right' }),
      cell(eur(calc.vrednostDt + calc.ddvDt), { align: 'right' }),
    ]}));
  }
  if (calc.urDi > 0) {
    invoiceRows.push(new TableRow({ children: [
      cell('Delo inženir'),
      cell(formatNum(calc.urDi), { align: 'right' }),
      cell('ura'),
      cell(eur(client.cenaDi), { align: 'right' }),
      cell(eur(calc.vrednostDi), { align: 'right' }),
      cell('22', { align: 'right' }),
      cell(eur(calc.ddvDi), { align: 'right' }),
      cell(eur(calc.vrednostDi + calc.ddvDi), { align: 'right' }),
    ]}));
  }
  if (calc.vrednostDp > 0) {
    invoiceRows.push(new TableRow({ children: [
      cell('Delo po ponudbi'),
      cell('1', { align: 'right' }),
      cell('kos'),
      cell(eur(calc.vrednostDp), { align: 'right' }),
      cell(eur(calc.vrednostDp), { align: 'right' }),
      cell('22', { align: 'right' }),
      cell(eur(calc.ddvDp), { align: 'right' }),
      cell(eur(calc.vrednostDp + calc.ddvDp), { align: 'right' }),
    ]}));
  }

  // Totals row
  invoiceRows.push(new TableRow({ children: [
    cell('SKUPAJ', { bold: true, colspan: 4, shade: LIGHT_GRAY }),
    cell(eur(calc.skupajBrezDDV), { bold: true, align: 'right', shade: LIGHT_GRAY }),
    cell('', { shade: LIGHT_GRAY }),
    cell(eur(calc.ddv), { bold: true, align: 'right', shade: LIGHT_GRAY }),
    cell(eur(calc.skupajZDDV), { bold: true, align: 'right', shade: LIGHT_GRAY }),
  ]}));

  const invoiceTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: invoiceRows,
  });

  // === PAGE 2: PRILOGA ===
  const appendixSections: Paragraph[] = [];
  appendixSections.push(
    new Paragraph({
      children: [new TextRun({ text: `Priloga računa št. ${metadata.stevilkaRacuna}`, bold: true, size: 24 })],
      spacing: { after: 200 },
    })
  );

  const sortedEntries = [...entries].sort((a, b) => b.datum.getTime() - a.datum.getTime());
  const isUmbrella = client.billingType === 'umbrella';

  function makeAppendixTable(rows: WorkEntry[], showStatus: boolean): Table {
    const tableRows: TableRow[] = [
      headerRow(['Delo', 'Datum', 'Kontakt', 'Vrsta dela', 'Ure', 'Opis', 'Opravil']),
      ...rows.map(e => {
        let vrstaLabel = e.vrstaDela ?? '';
        if (e.jeVkljucena && e.vrstaDela !== 'V') vrstaLabel = 'V (vklj.)';
        return new TableRow({ children: [
          cell(e.delo),
          cell(formatDateSl(e.datum)),
          cell(e.kontakt),
          cell(vrstaLabel),
          cell(formatNum(e.steviloUr)),
          cell(e.opis),
          cell(e.opravil),
        ]});
      }),
    ];
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    });
  }

  if (isUmbrella) {
    const byStranka: Record<string, WorkEntry[]> = {};
    for (const e of sortedEntries) {
      if (!byStranka[e.stranka]) byStranka[e.stranka] = [];
      byStranka[e.stranka].push(e);
    }
    for (const [stranka, rows] of Object.entries(byStranka)) {
      appendixSections.push(
        new Paragraph({
          children: [new TextRun({ text: `═══ ${stranka} ═══`, bold: true, size: 20 })],
          spacing: { before: 200, after: 100 },
        })
      );
      appendixSections.push(makeAppendixTable(rows, false) as unknown as Paragraph);
      const dtUr = rows.filter(r => r.vrstaDela === 'Dt' && !r.jeVkljucena && !r.jePodPragom).reduce((s, r) => s + r.steviloUr, 0);
      const diUr = rows.filter(r => r.vrstaDela === 'Di' && !r.jeVkljucena && !r.jePodPragom).reduce((s, r) => s + r.steviloUr, 0);
      appendixSections.push(new Paragraph({
        children: [new TextRun({ text: `Skupaj ${stranka}: Dt ${formatNum(dtUr)} ur | Di ${formatNum(diUr)} ur`, size: 18 })],
        spacing: { before: 100, after: 200 },
      }));
    }
    appendixSections.push(new Paragraph({
      children: [new TextRun({ text: `═══ SKUPAJ za obračun ═══`, bold: true })],
      spacing: { before: 200, after: 100 },
    }));
    appendixSections.push(new Paragraph({
      children: [new TextRun({ text: `D tehnik: ${formatNum(calc.urDt)} ur | D inženir: ${formatNum(calc.urDi)} ur` })],
    }));
  } else {
    appendixSections.push(makeAppendixTable(sortedEntries, true) as unknown as Paragraph);
    appendixSections.push(new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: `SKUPAJ: Dt ${formatNum(calc.urDt)} ur | Di ${formatNum(calc.urDi)} ur`, bold: true })],
    }));
  }

  // === Header paragraphs for page 1 ===
  const headerParagraphs: Paragraph[] = [];

  if (logoBuffer) {
    headerParagraphs.push(new Paragraph({
      children: [new ImageRun({
        data: logoBuffer,
        transformation: { width: 150, height: 50 },
        type: 'jpg',
      })],
      spacing: { after: 200 },
    }));
  } else {
    headerParagraphs.push(new Paragraph({
      children: [new TextRun({ text: 'TALPAS d.o.o.', bold: true, size: 28 })],
      spacing: { after: 200 },
    }));
  }

  headerParagraphs.push(
    new Paragraph({ children: [new TextRun({ text: `${IZDAJATELJ.ime} | ${IZDAJATELJ.naslov}`, size: 16 })] }),
    new Paragraph({ children: [new TextRun({ text: `ID za DDV: ${IZDAJATELJ.idDDV} | IBAN: ${IZDAJATELJ.iban}`, size: 16 })] }),
    new Paragraph({ children: [new TextRun({ text: ' ' })], spacing: { after: 200 } }),

    new Paragraph({ children: [new TextRun({ text: 'PREJEMNIK', bold: true, size: 18 })] }),
    new Paragraph({ children: [new TextRun({ text: client.imeNaRacunu, size: 18 })] }),
    new Paragraph({ children: [new TextRun({ text: client.naslov, size: 18 })] }),
    new Paragraph({ children: [new TextRun({ text: `${client.posta} ${client.kraj}`, size: 18 })] }),
    new Paragraph({ children: [new TextRun({ text: `ID za DDV: ${client.idDDV}`, size: 18 })] }),
    new Paragraph({ children: [new TextRun({ text: ' ' })], spacing: { after: 200 } }),
  );

  // Račun metadata (yellow highlight)
  const makeMeta = (label: string, value: string, yellow = false) =>
    new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 18 }),
        new TextRun({ text: value, size: 18, highlight: yellow ? 'yellow' : undefined }),
      ],
    });

  headerParagraphs.push(
    makeMeta('Račun št.', metadata.stevilkaRacuna, true),
    makeMeta('Datum računa', metadata.datumRacuna, true),
    makeMeta('Rok plačila', metadata.rokPlacila, true),
    makeMeta('Obdobje', `${metadata.obdobjeOd} – ${metadata.obdobjeDo}`),
    new Paragraph({ children: [new TextRun({ text: ' ' })], spacing: { after: 200 } }),
  );

  // Stamp + signature
  const footerParagraphs: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: ' ' })], spacing: { before: 400 } }),
    new Paragraph({ children: [new TextRun({ text: `Izdala: ${IZDAJATELJ.izdala}`, size: 18 })] }),
  ];

  if (stampBuffer) {
    footerParagraphs.push(new Paragraph({
      children: [new ImageRun({
        data: stampBuffer,
        transformation: { width: 100, height: 100 },
        type: 'png',
      })],
    }));
  }

  if (footerBuffer) {
    footerParagraphs.push(new Paragraph({
      children: [new ImageRun({
        data: footerBuffer,
        transformation: { width: 600, height: 60 },
        type: 'jpg',
      })],
      spacing: { before: 400 },
    }));
  } else {
    footerParagraphs.push(new Paragraph({
      children: [new TextRun({ text: `${IZDAJATELJ.ime} | ${IZDAJATELJ.naslov} | ${IZDAJATELJ.email}`, size: 14, color: '666666' })],
      spacing: { before: 400 },
    }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          ...headerParagraphs,
          invoiceTable,
          ...footerParagraphs,
          new Paragraph({ children: [new PageBreak()] }),
          ...appendixSections,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Racun_${metadata.stevilkaRacuna}_${client.id}.docx`);
}

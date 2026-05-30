import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import type { WorkEntry, InvoiceMetadata, Calculations } from './types';
import type { StrankaPodatki } from '../config/constants';
import { formatEUR, formatUre } from './calculations';

function slDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)}.${parseInt(m)}.${y}`;
}

function fmt(d: Date): string {
  return d.toLocaleDateString('sl-SI');
}

export async function generateDocx(
  entries: WorkEntry[],
  metadata: InvoiceMetadata,
  calc: Calculations,
  stranka: StrankaPodatki,
  _logoBuffer?: ArrayBuffer,
  _stampBuffer?: ArrayBuffer,
) {
  // Naloži template
  const tplRes = await fetch(`${import.meta.env.BASE_URL}template.docx`);
  if (!tplRes.ok) throw new Error('Template not found at /template.docx');
  const tplBuffer = await tplRes.arrayBuffer();

  const zip = new PizZip(tplBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
  });

  const sklic = metadata.stevilkaRacuna.slice(-7);

  // Priprava postavk za prilogo (sortirano padajoče po datumu, brez "V" če želimo — TODO preveri specifikacijo)
  const postavke = [...entries]
    .sort((a, b) => b.datum.getTime() - a.datum.getTime())
    .map((e, i) => ({
      stevilka: i + 1,
      delo: e.delo,
      datum: fmt(e.datum),
      kontakt: e.kontakt,
      vrstaDela: e.vrstaDela ?? '',
      steviloUr: formatUre(e.steviloUr),
      opis: e.opis,
      opravil: e.opravil,
    }));

  doc.render({
    // Glava računa
    stevilkaRacuna: metadata.stevilkaRacuna,
    datumRacuna: slDate(metadata.datumRacuna),
    rokPlacila: slDate(metadata.rokPlacila),
    sklic,
    SKLIC: sklic,
    obdobjeOd: slDate(metadata.obdobjeOd),
    obdobjeDo: slDate(metadata.obdobjeDo),

    // Stranka (zaenkrat ne nadomeščamo v template, ker je hardkodirana Delfin)
    strankaIme: stranka.ime,
    strankaNaslov: stranka.naslov,
    strankaPosta: stranka.posta,
    strankaKraj: stranka.kraj,
    strankaIdDDV: stranka.idDDV,
    STRANKAIDDDV: stranka.idDDV,

    // Glavna tabela računa
    opisVzdrzevanja: metadata.opisVzdrzevanja,
    vzdrzevanjeOsnova: formatEUR(calc.znesekVzdrzevanja),
    vzdrzevanjeDDV: formatEUR(calc.ddvVzdrzevanje),
    vzdrzevanjeZDDV: formatEUR(calc.znesekVzdrzevanja + calc.ddvVzdrzevanje),

    urDt: formatUre(calc.urDt),
    vrednostDt: formatEUR(calc.vrednostDt),
    ddvDt: formatEUR(calc.ddvDt),
    dtZDDV: formatEUR(calc.vrednostDt + calc.ddvDt),

    urDi: formatUre(calc.urDi),
    vrednostDi: formatEUR(calc.vrednostDi),
    ddvDi: formatEUR(calc.ddvDi),
    diZDDV: formatEUR(calc.vrednostDi + calc.ddvDi),

    skupajBrezDDV: formatEUR(calc.skupajBrezDDV),
    ddvSkupaj: formatEUR(calc.ddv),
    skupajZDDV: formatEUR(calc.skupajZDDV),

    // Priloga
    postavke,
    skupajUrDt: formatUre(calc.urDt),
    skupajUrDi: formatUre(calc.urDi),
  });

  const out = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const fileSafe = stranka.ime.replace(/[^a-zA-Z0-9čćžšđČĆŽŠĐ_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  saveAs(out, `${metadata.stevilkaRacuna}_${fileSafe}_vzdrzevanje.docx`);
}

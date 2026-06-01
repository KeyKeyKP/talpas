import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { WorkEntry, ClientConfig, InvoiceMetadata } from './types';
import { izracunaj, formatNum } from './calculations';
import { IZDAJATELJ } from '../config/constants';

function eur(v: number) {
  return v.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateSl(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

async function loadTemplate(basePath: string): Promise<ArrayBuffer> {
  const res = await fetch(`${basePath}/assets/template_racun.docx`);
  if (!res.ok) throw new Error(`Predloga template_racun.docx ni najdena (${res.status}). Naloži jo v public/assets/.`);
  return res.arrayBuffer();
}

export async function generateDocx(
  entries: WorkEntry[],
  client: ClientConfig,
  metadata: InvoiceMetadata,
  basePath = '/talpas'
): Promise<void> {
  const calc = izracunaj(entries, client, metadata.znesekVzdrzevanja);
  const templateBuffer = await loadTemplate(basePath);

  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Postavke za tabelo računa
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

  // Vrstice za prilogo (sortirano po datumu padajoče)
  const sortedEntries = [...entries].sort((a, b) => b.datum.getTime() - a.datum.getTime());
  const isUmbrella = client.billingType === 'umbrella';

  // Grupiranje po stranki za umbrella
  const prilogaSekcije: { naslov: string; vrstice: object[]; skupajDt: string; skupajDi: string }[] = [];

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
        naslov: stranka,
        vrstice: rows.map(e => ({
          delo: e.delo,
          datum: formatDateSl(e.datum),
          kontakt: e.kontakt,
          vrsta: e.jeVkljucena && e.vrstaDela !== 'V' ? 'V (vklj.)' : (e.vrstaDela ?? ''),
          ure: formatNum(e.steviloUr),
          opis: e.opis,
          opravil: e.opravil,
          status: e.jeVkljucena ? 'Vključeno' : e.jePodPragom ? 'Pod pragom' : 'Za obračun',
        })),
        skupajDt: formatNum(dtUr),
        skupajDi: formatNum(diUr),
      });
    }
  }

  const prilogaVrstice = sortedEntries.map(e => ({
    delo: e.delo,
    datum: formatDateSl(e.datum),
    kontakt: e.kontakt,
    vrsta: e.jeVkljucena && e.vrstaDela !== 'V' ? 'V (vklj.)' : (e.vrstaDela ?? ''),
    ure: formatNum(e.steviloUr),
    opis: e.opis,
    opravil: e.opravil,
    status: e.jeVkljucena ? 'Vključeno' : e.jePodPragom ? 'Pod pragom' : 'Za obračun',
  }));

  doc.render({
    // Izdajatelj
    izdajatelj_ime: IZDAJATELJ.ime ?? '',
    izdajatelj_naslov: IZDAJATELJ.naslov ?? '',
    izdajatelj_idDDV: IZDAJATELJ.idDDV ?? '',
    izdajatelj_iban: IZDAJATELJ.iban ?? '',
    izdajatelj_swift: IZDAJATELJ.swift ?? '',
    izdajatelj_maticna: IZDAJATELJ.maticnaSt ?? '',
    izdajatelj_email: IZDAJATELJ.email ?? '',
    izdajatelj_web: IZDAJATELJ.web ?? '',
    izdala: IZDAJATELJ.izdala ?? '',

    // Prejemnik
    stranka_ime: client.imeNaRacunu ?? '',
    stranka_naslov: client.naslov ?? '',
    stranka_posta: client.posta ?? '',
    stranka_kraj: client.kraj ?? '',
    stranka_idDDV: client.idDDV ?? '',

    // Metadata računa
    stevilkaRacuna: metadata.stevilkaRacuna ?? '',
    datumRacuna: metadata.datumRacuna ?? '',
    rokPlacila: metadata.rokPlacila ?? '',
    obdobjeOd: metadata.obdobjeOd ?? '',
    obdobjeDo: metadata.obdobjeDo ?? '',

    // Postavke
    postavke,
    skupajBrezDDV: eur(calc.skupajBrezDDV),
    skupajDDV: eur(calc.ddv),
    skupajZDDV: eur(calc.skupajZDDV),

    // Priloga
    prilogaStevilka: metadata.stevilkaRacuna ?? '',
    prilogaVrstice,
    isUmbrella,
    prilogaSekcije,
    skupajDt: formatNum(calc.urDt),
    skupajDi: formatNum(calc.urDi),
  });

  const blob = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  saveAs(blob, `Racun_${metadata.stevilkaRacuna}_${client.id}.docx`);
}

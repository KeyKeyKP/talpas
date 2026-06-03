import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { WorkEntry, ClientConfig, InvoiceMetadata } from './types';
import { izracunaj, izracunajUniverza, formatNum } from './calculations';
import { IZDAJATELJ, DDV_STOPNJA } from '../config/constants';

function eur(v: number) {
  return v.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateSl(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
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
  const calc = izracunaj(entries, client, metadata.znesekVzdrzevanja, metadata.znesekGostovanja);
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
    imeStranke: client.imeNaRacunu ?? '',
    naslovStranke: client.naslov ?? '',
    postaStranke: client.posta ?? '',
    krajStranke: client.kraj ?? '',
    idDDV: client.idDDV ?? '',

    // Metadata računa
    stevilkaRacuna: metadata.stevilkaRacuna ?? '',
    sklic: 'SI 00 ' + (metadata.stevilkaRacuna ?? ''),
    datumRacuna: metadata.datumRacuna ?? '',
    rokPlacila: metadata.rokPlacila ?? '',
    obdobjeOd: metadata.obdobjeOd ?? '',
    obdobjeDo: metadata.obdobjeDo ?? '',

    // Vzdrževanje vrstica
    opisVzdrzevanja: (metadata.opisVzdrzevanja || 'Vzdrževanje po Pogodbi o vzdrževanju IT opreme') ?? '',
    znesekVzdrzevanja: eur(calc.znesekVzdrzevanja),
    ddvVzdrzevanje: eur(calc.ddvVzdrzevanje),
    vzdrzevanjeZDDV: eur(calc.znesekVzdrzevanja + calc.ddvVzdrzevanje),

    // Delo tehnik vrstica
    urDt: formatNum(calc.urDt),
    cenaDt: eur(client.cenaDt),
    vrednostDt: eur(calc.vrednostDt),
    ddvDt: eur(calc.ddvDt),
    dtZDDV: eur(calc.vrednostDt + calc.ddvDt),

    // Delo inženir vrstica
    urDi: formatNum(calc.urDi),
    cenaDi: eur(client.cenaDi),
    vrednostDi: eur(calc.vrednostDi),
    ddvDi: eur(calc.ddvDi),
    diZDDV: eur(calc.vrednostDi + calc.ddvDi),

    // Delo po ponudbi vrstica
    vrednostDp: eur(calc.vrednostDp),
    ddvDp: eur(calc.ddvDp),
    dpZDDV: eur(calc.vrednostDp + calc.ddvDp),

    // Skupaj
    skupajBrezDDV: eur(calc.skupajBrezDDV),
    skupajDDV: eur(calc.ddv),
    skupajZDDV: eur(calc.skupajZDDV),
    skupajZaPlacilo: eur(calc.skupajZDDV),

    // Postavke (loop – za nazaj kompatibilnost)
    postavke,

    // Vzdrževanje – conditional row (empty array = hidden)
    vzdrzevanjeArr: calc.znesekVzdrzevanja > 0 ? [{
      opisVzdrzevanja: metadata.opisVzdrzevanja || 'Vzdrževanje po Pogodbi o vzdrževanju IT opreme',
      znesekVzdrzevanja: eur(calc.znesekVzdrzevanja),
      ddvVzdrzevanje: eur(calc.ddvVzdrzevanje),
      vzdrzevanjeZDDV: eur(calc.znesekVzdrzevanja + calc.ddvVzdrzevanje),
    }] : [],

    // Delo tehnik – conditional row (empty array = hidden)
    dtArr: calc.urDt > 0 ? [{
      urDt: formatNum(calc.urDt),
      cenaDt: eur(client.cenaDt),
      vrednostDt: eur(calc.vrednostDt),
      ddvDt: eur(calc.ddvDt),
      dtZDDV: eur(calc.vrednostDt + calc.ddvDt),
    }] : [],

    // Delo inženir – conditional row (empty array = hidden)
    diArr: calc.urDi > 0 ? [{
      urDi: formatNum(calc.urDi),
      cenaDi: eur(client.cenaDi),
      vrednostDi: eur(calc.vrednostDi),
      ddvDi: eur(calc.ddvDi),
      diZDDV: eur(calc.vrednostDi + calc.ddvDi),
    }] : [],

    // Gostovanje – conditional row (empty array = hidden)
    gostovanjeArr: calc.znesekGostovanja > 0 ? [{
      znesekGostovanja: eur(calc.znesekGostovanja),
      ddvGostovanja: eur(calc.ddvGostovanje),
      gostovanjeZDDV: eur(calc.znesekGostovanja + calc.ddvGostovanje),
    }] : [],

    // Dp – conditional row (empty array = hidden)
    dpArr: calc.vrednostDp > 0 ? [{
      vrednostDp: eur(calc.vrednostDp),
      ddvDp: eur(calc.ddvDp),
      dpZDDV: eur(calc.vrednostDp + calc.ddvDp),
    }] : [],

    // Priloga
    prilogaStevilka: metadata.stevilkaRacuna ?? '',
    priloga: prilogaVrstice,
    prilogaVrstice,
    isUmbrella,
    prilogaSekcije,
    skupajUrDt: formatNum(calc.urDt),
    skupajUrDi: formatNum(calc.urDi),
  });

  const blob = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  saveAs(blob, `Racun_${metadata.stevilkaRacuna}_${client.id}.docx`);
}

export async function generateUniversityInvoice(
  entries: WorkEntry[],
  client: ClientConfig,
  metadata: InvoiceMetadata,
  basePath = '/talpas'
): Promise<void> {
  const calc = izracunajUniverza(entries, client.cenaDt, metadata.znesekVzdrzevanja);
  const templateBuffer = await loadTemplate(basePath);

  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

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

  // Per-faculty appendix sections (all entries incl. V, sorted by date desc)
  const sortedEntries = [...entries].sort((a, b) => b.datum.getTime() - a.datum.getTime());
  const byFakulteta: Record<string, WorkEntry[]> = {};
  for (const e of sortedEntries) {
    if (!byFakulteta[e.stranka]) byFakulteta[e.stranka] = [];
    byFakulteta[e.stranka].push(e);
  }

  const prilogaSekcije = Object.entries(byFakulteta).map(([fakulteta, rows]) => {
    const dUr = rows.filter(r => r.vrstaDela === 'D').reduce((s, r) => s + r.steviloUr, 0);
    return {
      naslov: `${metadata.stevilkaRacuna} – ${fakulteta}`,
      vrstice: rows.map(e => ({
        delo: e.delo ?? '',
        datum: formatDateSl(e.datum),
        kontakt: e.kontakt ?? '',
        vrstaDela: e.vrstaDela ?? '',
        steviloUr: formatNum(e.steviloUr),
        opis: e.opis ?? '',
        opravil: e.opravil ?? '',
      })),
      skupajUrDt: formatNum(dUr),
      skupajUrDi: '',
    };
  });

  doc.render({
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
      urDt: formatNum(calc.urD),
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
    prilogaVrstice: [],
    isUmbrella: true,
    prilogaSekcije,
    skupajUrDt: formatNum(calc.urD),
    skupajUrDi: '0,00',
  });

  const blob = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  saveAs(blob, `Racun_${metadata.stevilkaRacuna}_${client.id}.docx`);
}

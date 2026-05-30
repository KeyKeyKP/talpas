export const DEFAULT_CENA_DT = 48.00;
export const DEFAULT_CENA_DI = 70.00;
export const DDV_STOPNJA = 0.22;

export const DEFAULT_VZDRZEVANJE_OPIS =
  "Vzdrževanje po Pogodbi o vzdrževanju informacijske infrastrukture in omrežja v hotelskih sobah z dne 12.12.2024";

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

export interface StrankaPodatki {
  ime: string;
  naslov: string;
  posta: string;
  kraj: string;
  idDDV: string;
}

// Znane stranke s polnimi podatki. Excel lahko vsebuje tudi druge stranke –
// te bodo izbiri v dropdownu, ampak Word bo imel samo ime (naslov/ID DDV prazno).
export const ZNANE_STRANKE: Record<string, StrankaPodatki> = {
  "Delfin Hotel": {
    ime: "Delfin Hotel ZDUS d.o.o. Izola",
    naslov: "Tomažičeva ulica 10",
    posta: "6310",
    kraj: "Izola",
    idDDV: "SI22376941",
  },
};

export function najdiStranko(imeIzExcela: string): StrankaPodatki {
  const norm = imeIzExcela.trim().toLowerCase();
  for (const [kljuc, podatki] of Object.entries(ZNANE_STRANKE)) {
    if (norm.includes(kljuc.toLowerCase())) return podatki;
  }
  return {
    ime: imeIzExcela.trim(),
    naslov: "",
    posta: "",
    kraj: "",
    idDDV: "",
  };
}

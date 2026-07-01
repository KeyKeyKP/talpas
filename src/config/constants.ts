export const DEFAULT_CENA_DT = 48.00;
export const DEFAULT_CENA_DI = 70.00;
export const DDV_STOPNJA = 0.22;

// Urna postavka za UP (univerzitetni Word izvoz). UL ostane po svojem registru/DEFAULT.
export const CENA_URE_UP = 64.00;

// Besedilo nad tabelo računa – ločeno za UP in UL (univerzitetni workflow).
// {obdobjeOd} in {obdobjeDo} se zamenjata z dejanskimi datumi (d.M.yyyy) pri renderju.
export const UNI_INTRO_UP =
  'Račun za opravljene storitve v obdobju od {obdobjeOd} do {obdobjeDo} na podlagi Okvirnega sporazuma za vzdrževanje in nadgradnja Visokošolskega informacijskega sistema (VIS) na Univerzi na Primorskem za obdobje štirih let št. 185-65/23 z dne 1.6.2023.';

export const UNI_INTRO_UL =
  'Račun za opravljene storitve po Pogodbi št. 401-20/2022 za vzdrževanje in razvoj programskega paketa VIS na UL z dne 23.1.2023 in na podlagi nabavnega naročila št. 4500061325 z dne 9.3.2023 za obdobje od {obdobjeOd} do {obdobjeDo}.';

// Opis prve postavke (vzdrževanje) – UP po Okvirnem sporazumu, UL po Pogodbi.
export const UNI_VZDRZEVANJE_OPIS_UP = 'Vzdrževanje programske opreme po Okvirnem sporazumu';
export const UNI_VZDRZEVANJE_OPIS_UL = 'Vzdrževanje programske opreme po Pogodbi';

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

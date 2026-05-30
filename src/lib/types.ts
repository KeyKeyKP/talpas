export type WorkType = 'Dt' | 'Di' | 'V' | null;

export interface WorkEntry {
  id: string;
  stranka: string;
  delo: string;
  datum: Date;
  kontakt: string;
  vrstaDela: WorkType;
  steviloUr: number;
  steviloUrOriginal: number;
  opis: string;
  opravil: string;
}

export interface InvoiceMetadata {
  stevilkaRacuna: string;
  datumRacuna: string;
  rokPlacila: string;
  obdobjeOd: string;
  obdobjeDo: string;
  znesekVzdrzevanja: number;
  opisVzdrzevanja: string;
}

export interface Calculations {
  urDt: number;
  urDi: number;
  vrednostDt: number;
  vrednostDi: number;
  znesekVzdrzevanja: number;
  skupajBrezDDV: number;
  ddv: number;
  skupajZDDV: number;
  ddvVzdrzevanje: number;
  ddvDt: number;
  ddvDi: number;
}

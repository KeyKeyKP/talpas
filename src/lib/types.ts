export type WorkType = 'Dt' | 'Di' | 'Dp' | 'V' | 'D' | null;
export type BillingType = 'standard' | 'included_hours' | 'threshold' | 'umbrella';

export interface ClientConfig {
  id: string;
  imeZaIskanje: string[];
  imeNaRacunu: string;
  naslov: string;
  posta: string;
  kraj: string;
  idDDV: string;
  cenaDt: number;
  cenaDi: number;
  znesekVzdrzevanja: number;
  opisVzdrzevanja: string;
  billingType: BillingType;
  gostovanj?: number;
  includedHours?: number;
  thresholdHours?: number;
  thresholdMonths?: number;
  krovnaStranka?: string;
}

export interface WorkEntry {
  id: string;
  stranka: string;
  skupina: string;
  delo: string;
  datum: Date;
  datumStr?: string;
  kontakt: string;
  vrstaDela: WorkType;
  steviloUr: number;
  steviloUrOriginal: number;
  opis: string;
  opravil: string;
  jeVkljucena: boolean;
  jePodPragom: boolean;
  dpZnesek?: number;
}

export interface InvoiceMetadata {
  stevilkaRacuna: string;
  datumRacuna: string;
  rokPlacila: string;
  obdobjeOd: string;
  obdobjeDo: string;
  znesekVzdrzevanja: number;
  znesekGostovanja: number;
  opisVzdrzevanja: string;
}

export interface InvoiceCalc {
  urDt: number;
  urDi: number;
  vrednostDt: number;
  vrednostDi: number;
  vrednostDp: number;
  znesekVzdrzevanja: number;
  znesekGostovanja: number;
  skupajBrezDDV: number;
  ddv: number;
  skupajZDDV: number;
  ddvVzdrzevanje: number;
  ddvGostovanje: number;
  ddvDt: number;
  ddvDi: number;
  ddvDp: number;
}

export interface MonthlyHours {
  mesec: string;
  skupajUr: number;
}

export interface UniversityCalc {
  urD: number;
  vrednostD: number;
  vrednostDp: number;
  znesekVzdrzevanja: number;
  skupajBrezDDV: number;
  ddv: number;
  skupajZDDV: number;
  poFakultetah: Array<{
    fakulteta: string;
    urD: number;
    dpZnesek: number;
  }>;
}

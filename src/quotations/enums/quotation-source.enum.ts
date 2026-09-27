/**
 * Origem de uma cotação.
 * MANUAL: cadastrada por um usuário. LME: importada da London Metal Exchange (integração futura).
 */
export enum QuotationSource {
  Manual = 'MANUAL',
  Lme = 'LME',
  Other = 'OTHER',
}

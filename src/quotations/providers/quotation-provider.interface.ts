import { CreateQuotationDto } from '../dto/create-quotation.dto';
import { QuotationSource } from '../enums/quotation-source.enum';

/** Cotação obtida de uma fonte externa, pronta para ser gravada pelo QuotationsService. */
export type ExternalQuotation = Omit<CreateQuotationDto, 'source'>;

/**
 * Contrato para integrações com fontes externas de cotação.
 *
 * Ponto de extensão para a futura integração com a LME. Exemplo de implementação:
 *
 * ```ts
 * @Injectable()
 * export class LmeQuotationService implements QuotationProvider {
 *   readonly source = QuotationSource.Lme;
 *   async fetchQuotations(date: string): Promise<ExternalQuotation[]> {
 *     // chamar a API da LME e mapear a resposta
 *   }
 * }
 * ```
 *
 * A implementação deve ser registrada em `QuotationsModule.providers`, e os dados obtidos
 * gravados via `QuotationsService.create()` com `source` igual a `provider.source`.
 */
export interface QuotationProvider {
  readonly source: QuotationSource;
  fetchQuotations(date: string): Promise<ExternalQuotation[]>;
}

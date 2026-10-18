# Roadmap

Funcionalidades planejadas e ainda **não implementadas**. As já entregues estão em [Concluído](#concluído), no fim.

## Integração com a LME

Implementar `LmeQuotationService` seguindo o contrato `QuotationProvider` (`src/quotations/providers/quotation-provider.interface.ts`), gravando as cotações com `source = LME`, possivelmente com rotina agendada.

## Formação de preços

Evoluir o `PricingCalculationService` para usar cotações cadastradas, componentes configuráveis por fórmula e conversão de moeda/unidade, expondo um endpoint de simulação de preço.

## Contratos de hedge

Novo módulo para registrar contratos de hedge e considerá-los na formação de preços.

## Concluído

### Recuperação de senha por e-mail

**Status:** implementada. Uso e configuração do SMTP no [README](../README.md#recuperação-de-senha).

- `POST /auth/forgot-password` e `POST /auth/reset-password` (públicas), em `src/auth/` (`PasswordResetService`).
- Token aleatório gravado só como hash SHA-256 (`password_reset_tokens`), válido por 1 hora, de uso único; um pedido novo invalida os anteriores.
- A nova senha é gravada por `UsersService.updatePassword()`, que invalida os JWT já emitidos.
- Limite de pedidos por IP real (atrás do proxy, `TRUST_PROXY`) e por e-mail (`@nestjs/throttler`, em memória).
- Envio atrás da interface `MailService` (`src/mail/`), com nodemailer: driver `log` (desenvolvimento, testes e CI) e `smtp` (homolog e produção).

**Evoluções possíveis:** contadores do limite num armazenamento compartilhado (ex.: Redis) se a API passar a rodar em mais de uma instância; limpeza periódica dos tokens expirados.

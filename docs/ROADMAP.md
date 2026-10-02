# Roadmap

Funcionalidades planejadas e evolução do produto.

## Recuperação de senha por e-mail

**Status:** implementada.

**Objetivo:** permitir que um usuário que esqueceu a senha solicite um link de redefinição por e-mail e defina uma nova senha sem estar autenticado.

**O que a base já oferece:**

- `UsersService.updatePassword(id, newPassword)` — ponto único para gravar uma nova senha (faz o hash e invalida os tokens existentes).
- `@IsStrongPassword()` (`common/validators`) — mesma política de senha usada no cadastro e na troca de senha.
- `@Public()` — para expor rotas sem autenticação.
- `AuthModule` — local indicado para as novas rotas e regras.
- Formato padrão de erros, Swagger, migrations e testes e2e prontos para receber a nova funcionalidade.

**Entregue:** envio por SMTP (com fallback de log fora de produção), tokens com hash, expiração e uso único, endpoints públicos, limitação de tentativas, Swagger e testes unitários/e2e.

## Integração com a LME

Implementar `LmeQuotationService` seguindo o contrato `QuotationProvider` (`src/quotations/providers/quotation-provider.interface.ts`), gravando as cotações com `source = LME`, possivelmente com rotina agendada.

## Formação de preços

Evoluir o `PricingCalculationService` para usar cotações cadastradas, componentes configuráveis por fórmula e conversão de moeda/unidade, expondo um endpoint de simulação de preço.

## Contratos de hedge

Novo módulo para registrar contratos de hedge e considerá-los na formação de preços.

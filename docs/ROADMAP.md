# Roadmap

Funcionalidades planejadas e ainda **não implementadas**.

## Recuperação de senha por e-mail

**Status:** não implementada — será desenvolvida como tarefa no Paperclip (configuração e prompt da tarefa em [PAPERCLIP.md](PAPERCLIP.md)).

**Objetivo:** permitir que um usuário que esqueceu a senha solicite um link de redefinição por e-mail e defina uma nova senha sem estar autenticado.

**O que a base já oferece:**

- `UsersService.updatePassword(id, newPassword)` — ponto único para gravar uma nova senha (faz o hash e invalida os tokens existentes).
- `@IsStrongPassword()` (`common/validators`) — mesma política de senha usada no cadastro e na troca de senha.
- `@Public()` — para expor rotas sem autenticação.
- `AuthModule` — local indicado para as novas rotas e regras.
- Formato padrão de erros, Swagger, migrations e testes e2e prontos para receber a nova funcionalidade.

**O que ainda não existe (a ser criado pela tarefa):**

- serviço de envio de e-mail e sua configuração (variáveis no `.env.example`);
- armazenamento de tokens de redefinição (entidade + migration), com expiração e uso único;
- endpoints públicos de solicitação e de redefinição;
- testes unitários e e2e do fluxo;
- documentação no README e no Swagger.

## Integração com a LME

Implementar `LmeQuotationService` seguindo o contrato `QuotationProvider` (`src/quotations/providers/quotation-provider.interface.ts`), gravando as cotações com `source = LME`, possivelmente com rotina agendada.

## Formação de preços

Evoluir o `PricingCalculationService` para usar cotações cadastradas, componentes configuráveis por fórmula e conversão de moeda/unidade, expondo um endpoint de simulação de preço.

## Contratos de hedge

Novo módulo para registrar contratos de hedge e considerá-los na formação de preços.

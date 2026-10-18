# Arquitetura

## Visão geral

```text
Requisição HTTP
   │
   ▼
JwtAuthGuard (global) ──► rotas @Public() passam direto
   │
   ▼
RolesGuard (global) ──► verifica @Roles(...)
   │
   ▼
ValidationPipe (global) ──► valida e normaliza o DTO (whitelist + transform)
   │
   ▼
Controller ──► apenas HTTP: rota, parâmetros, status code, Swagger
   │
   ▼
Service ──► regras de negócio, lança exceções HTTP do Nest
   │
   ▼
Repository<Entity> (TypeORM) ──► MySQL
   │
   ▼
ClassSerializerInterceptor ──► remove campos @Exclude() (ex.: password)
AllExceptionsFilter ──► padroniza qualquer erro em ErrorResponseDto
```

A configuração global (CORS, pipes, filtro, serializer, Swagger) fica em `src/app.setup.ts` e é compartilhada por `main.ts` e pelos testes e2e — o que é testado é exatamente o que roda em produção.

## Módulos

| Módulo       | Responsabilidade                                            | Depende de                          |
| ------------ | ----------------------------------------------------------- | ----------------------------------- |
| `auth`       | Login, logout, `/me`, perfil, troca e recuperação de senha  | `users`, `mail`, `common/security`  |
| `users`      | CRUD de usuários, hash de senha, invalidação de tokens      | `common/security`                   |
| `mail`       | Envio de e-mail (`MailService`; drivers `log` e `smtp`)     | —                                   |
| `products`   | CRUD de produtos                                            | —                                   |
| `quotations` | Cotações diárias, filtros por período/commodity/fonte       | —                                   |
| `pricing`    | Fórmulas de precificação e motor de cálculo                 | —                                   |
| `dashboard`  | Indicadores agregados                                       | services de todos os módulos acima  |
| `health`     | Disponibilidade da API e do banco                           | TypeORM DataSource                  |

Módulos se comunicam **por services exportados**, nunca acessando o repositório de outro módulo (ex.: o dashboard usa `ProductsService.count()`, e não `Repository<Product>`).

## Autenticação e sessões

- JWT stateless assinado com `JWT_SECRET`. Payload: `sub` (id), `email`, `role`, `tv` (versão do token).
- A cada requisição, o `JwtStrategy` recarrega o usuário e rejeita o token se o usuário estiver **inativo** ou se `tv` for diferente de `users.token_version`.
- `token_version` é incrementado no **logout**, na **troca de senha**, na **redefinição de senha por ADMIN** e na **recuperação de senha por e-mail** — invalidando todos os tokens emitidos antes.
- Senhas: bcrypt (`PasswordService`), política única em `common/validators/password.rules.ts`.
- Recuperação de senha (`PasswordResetService`): o token do link é aleatório (32 bytes) e só o hash SHA-256 fica em `password_reset_tokens`, com `expires_at` (1 hora) e `used_at` (uso único, marcado de forma atômica). O pedido responde sempre 204 e roda em segundo plano, para não revelar — nem pelo tempo de resposta — quais e-mails existem. Limite por IP e por e-mail com `@nestjs/throttler`; o IP vem de `req.ip`, que respeita `TRUST_PROXY` (Express `trust proxy`).
- E-mail: os módulos dependem só da classe abstrata `MailService`; `MailModule` entrega o `NodemailerMailService` com o driver de `MAIL_DRIVER`. Nos testes e2e, ela é trocada pelo `MailCatcher` (`test/support/mail.ts`).

## Banco de dados

- `synchronize: false` — o schema muda **somente por migrations**.
- Na inicialização: `DB_MIGRATIONS_RUN=true` aplica as migrations pendentes ao conectar depois o administrador inicial é criado se `ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` estiverem definidos e não houver nenhum ADMIN, e por fim `DB_SEED_ON_STARTUP=true` executa os seeds idempotentes (`DatabaseBootstrapService`), antes de a API responder. É o que permite o deploy automático sem comandos no servidor.
- Convenção de colunas: `snake_case` no banco (`created_at`, `token_version`), `camelCase` nas entidades.
- Índices únicos com nomes explícitos (`UQ_<tabela>_<colunas>`), traduzidos para HTTP 409 pelo filtro de erros.
- Colunas `DATE` trafegam como texto `YYYY-MM-DD` (sem conversão de fuso). `DECIMAL` é convertido para `number` pelo `decimalTransformer`.

## Pontos de extensão

| Futuro                      | Onde                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Integração LME              | Implementar `QuotationProvider` (`quotations/providers`) como `LmeQuotationService`      |
| Cálculo de preços           | Evoluir `PricingCalculationService` (`pricing/calculation`) e expor via controller       |
| Componentes de fórmula      | Nova entidade relacionada a `PricingFormula` + migration                                 |
| Contratos de hedge          | Novo módulo `hedge/` seguindo o padrão dos demais                                        |
| Novos e-mails               | Montar o `MailMessage` (HTML + texto) no módulo, como `auth/mail/`, e chamar `MailService` |
| Novos papéis                | `common/enums/role.enum.ts` + `@Roles(...)`                                              |

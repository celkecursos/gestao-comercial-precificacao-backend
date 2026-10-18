# Gestão Comercial e Precificação Dinâmica — API

> **HOSTINGER COM UM DESCONTÃO!**
>
> - Cupom: **CELKE**
> - [https://celke.com.br/page/hostinger](https://celke.com.br/page/hostinger)

API REST para apoiar processos comerciais de uma indústria: **produtos**, **cotações diárias**, **fórmulas de precificação** e **formação de preços**. Módulos previstos para as próximas versões: integração com cotações da **LME** e **contratos de hedge**.

Esta é a base do sistema: funcional, testada e organizada para receber novos módulos, desenvolvidos por pessoas ou por agentes de IA.

A aplicação é hospedada na **Hostinger** (Hostinger Web Application Hosting), com deploy automático a partir do GitHub para três ambientes: develop, homolog e produção. Veja [Ambientes e branches](#ambientes-e-branches) e [Produção (Hostinger)](#produção-hostinger).

---

## Sumário

- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração do `.env`](#configuração-do-env)
- [Banco de dados](#banco-de-dados)
- [Migrations](#migrations)
- [Seed](#seed)
- [Execução local](#execução-local)
- [Testes](#testes)
- [Swagger / OpenAPI](#swagger--openapi)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Principais endpoints](#principais-endpoints)
- [Credenciais de demonstração](#credenciais-de-demonstração)
- [Recuperação de senha](#recuperação-de-senha)
- [Ambientes e branches](#ambientes-e-branches)
- [Produção (Hostinger)](#produção-hostinger)
- [Scripts disponíveis](#scripts-disponíveis)

---

## Tecnologias

| Camada          | Tecnologia                                        |
| --------------- | ------------------------------------------------- |
| Runtime         | Node.js 24 LTS (mínimo 22)                        |
| Linguagem       | TypeScript                                        |
| Framework       | NestJS 11                                         |
| Banco de dados  | MySQL 8                                           |
| ORM             | TypeORM 0.3 (entidades + migrations versionadas)  |
| Autenticação    | JWT (`@nestjs/jwt` + Passport) e bcrypt           |
| Validação       | class-validator / class-transformer               |
| E-mail          | nodemailer (SMTP de qualquer provedor)            |
| Limite de taxa  | `@nestjs/throttler`                               |
| Documentação    | Swagger / OpenAPI (`@nestjs/swagger`)             |
| Testes          | Jest + Supertest                                  |
| Qualidade       | ESLint + Prettier                                 |

**Por que TypeORM?** É a integração nativa do NestJS: entidades são classes TypeScript com decorators (o modelo fica junto do código do módulo), as migrations são arquivos TypeScript versionados e o `migration:generate` detecta automaticamente diferenças entre entidades e banco — um fluxo previsível tanto para pessoas quanto para agentes de IA.

## Requisitos

- **Node.js 22+** (recomendado 24 LTS) e npm
- **MySQL 8+**, de uma destas formas:
  - **Docker** (recomendado): o `docker-compose.yml` sobe um MySQL já configurado; ou
  - MySQL instalado localmente.

## Instalação

```bash
git clone <url-do-repositorio>
cd gestao-comercial-precificacao
npm install
cp .env.example .env    # no Windows (PowerShell): Copy-Item .env.example .env
```

## Configuração do `.env`

O `.env` **nunca** é versionado. Todas as variáveis estão documentadas no `.env.example` e são validadas na inicialização — a aplicação não sobe se alguma estiver faltando ou inválida.

| Variável             | Descrição                                                              | Padrão                  |
| -------------------- | ---------------------------------------------------------------------- | ----------------------- |
| `NODE_ENV`           | `development`, `production` ou `test`                                  | `development`           |
| `PORT`               | Porta HTTP                                                             | `3000`                  |
| `FRONTEND_URL`       | Origens liberadas no CORS, separadas por vírgula (`*` libera todas)    | `http://localhost:5173` |
| `SWAGGER_ENABLED`    | Publica a documentação em `/api/docs`                                  | `true`                  |
| `DB_HOST`            | Host do MySQL                                                          | —                       |
| `DB_PORT`            | Porta do MySQL                                                         | `3306`                  |
| `DB_DATABASE`        | Nome do banco                                                          | —                       |
| `DB_USERNAME`        | Usuário do banco                                                       | —                       |
| `DB_PASSWORD`        | Senha do banco                                                         | vazio                   |
| `DB_TEST_DATABASE`   | Banco dos testes e2e (**apagado a cada execução**)                     | `<DB_DATABASE>_test`    |
| `DB_LOGGING`         | Exibe as queries SQL no log                                            | `false`                 |
| `DB_MIGRATIONS_RUN`  | Executa migrations pendentes ao iniciar a aplicação                    | `false`                 |
| `DB_SEED_ON_STARTUP` | Executa os seeds de demonstração ao iniciar (após as migrations)       | `false`                 |
| `ADMIN_NAME`         | Nome do administrador inicial (opcional)                               | —                       |
| `ADMIN_EMAIL`        | E-mail do administrador inicial (opcional)                             | —                       |
| `ADMIN_PASSWORD`     | Senha do administrador inicial (opcional, política de senha forte)     | —                       |
| `JWT_SECRET`         | Segredo de assinatura do JWT (**mínimo 32 caracteres**)                | —                       |
| `JWT_EXPIRES_IN`     | Validade do token (`1d`, `12h`, `3600`...)                             | `1d`                    |
| `BCRYPT_SALT_ROUNDS` | Custo do hash de senha (10–15)                                         | `10`                    |
| `TRUST_PROXY`        | Nº de proxies reversos na frente da API (define o IP real do cliente)  | `1`                     |
| `MAIL_DRIVER`        | `log` (só registra no log) ou `smtp` (envia)                           | `log`                   |
| `SMTP_HOST`          | Servidor SMTP (obrigatório com `smtp`)                                 | —                       |
| `SMTP_PORT`          | Porta SMTP: `465` ou `587` (obrigatório com `smtp`)                    | —                       |
| `SMTP_SECURE`        | `true` para TLS direto (465), `false` para STARTTLS (587) (idem)       | —                       |
| `SMTP_USER`          | Usuário SMTP (obrigatório com `smtp`)                                  | —                       |
| `SMTP_PASSWORD`      | Senha SMTP (obrigatório com `smtp`)                                    | —                       |
| `MAIL_FROM`          | Endereço do remetente (obrigatório com `smtp`)                         | —                       |
| `MAIL_FROM_NAME`     | Nome exibido do remetente                                              | `Gestão Comercial e Precificação` |
| `PASSWORD_RESET_URL` | Tela do frontend que recebe `?token=` (obrigatório com `smtp`)         | `http://localhost:5173/redefinir-senha` |

Gere um `JWT_SECRET` forte com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**CORS para vários ambientes** — basta alterar a variável, sem mexer no código:

```env
FRONTEND_URL=http://localhost:5173,https://devfront.uno.com,https://homologfront.uno.com,https://front.uno.com
```

## Banco de dados

### Opção A — Docker (recomendado)

```bash
docker compose up -d mysql
```

Sobe o MySQL 8.4 na porta **3307** do host (para não conflitar com um MySQL local na 3306), já com:

- banco `gestao_comercial` e usuário `gestao` (senha definida em `DB_PASSWORD`);
- banco `gestao_comercial_test` para os testes e2e.

Use no `.env`: `DB_HOST=127.0.0.1`, `DB_PORT=3307`, `DB_USERNAME=gestao` e a senha de sua escolha em `DB_PASSWORD` (defina-a **antes** do primeiro `docker compose up`, pois o MySQL só lê essas variáveis na criação do volume).

### Opção B — MySQL local

Crie um usuário com permissão no banco (exemplo):

```sql
CREATE USER 'gestao'@'localhost' IDENTIFIED BY 'sua_senha';
GRANT ALL PRIVILEGES ON gestao_comercial.* TO 'gestao'@'localhost';
GRANT ALL PRIVILEGES ON gestao_comercial_test.* TO 'gestao'@'localhost';
```

Ajuste `DB_HOST`, `DB_PORT=3306`, `DB_USERNAME` e `DB_PASSWORD` no `.env` e crie o banco:

```bash
npm run db:create
```

### Tudo de uma vez

```bash
npm run db:setup   # db:create + migration:run + seed
```

## Migrations

O schema é controlado **exclusivamente por migrations** (`synchronize` está desligado). Os arquivos ficam em `src/database/migrations`.

```bash
npm run migration:run       # aplica as migrations pendentes
npm run migration:show      # lista migrations aplicadas/pendentes
npm run migration:revert    # desfaz a última migration

# Após criar/alterar uma entidade, gere a migration automaticamente:
npm run migration:generate -- src/database/migrations/NomeDaAlteracao

# Migration vazia, para escrever SQL manualmente:
npm run migration:create -- src/database/migrations/NomeDaAlteracao
```

## Seed

```bash
npm run seed
```

Cria usuários, produtos, cotações e fórmulas de demonstração. É **idempotente**: pode ser executado várias vezes sem duplicar registros. Os dados ficam em `src/database/seeds/seed-data.ts`.

Também é possível executar o seed **automaticamente ao iniciar a aplicação**, sem nenhum comando, com `DB_SEED_ON_STARTUP=true` (ver [Migrations e seeds no deploy automático](#migrations-e-seeds-no-deploy-automático)).

## Execução local

```bash
npm run dev          # desenvolvimento, com reload automático
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- Health check: http://localhost:3000/health

Para rodar a versão compilada:

```bash
npm run build
npm run start
```

Também é possível subir **MySQL + API** em containers: `docker compose --profile app up -d --build` (as migrations rodam automaticamente na inicialização).

## Testes

```bash
npm run test         # testes unitários (não precisam de banco)
npm run test:cov     # unitários com relatório de cobertura
npm run test:e2e     # testes ponta a ponta contra MySQL real
npm run lint         # ESLint
```

Os testes **e2e** usam o banco `DB_TEST_DATABASE`, que é **apagado e recriado** (migrations + seed) a cada execução — nunca aponte para o banco principal (a suíte se recusa a rodar se os nomes forem iguais).

Cobertura atual: autenticação (login, logout, perfil, troca e recuperação de senha, limite de pedidos), criação e validação de usuários, permissões por papel, produtos, cotações (filtros, datas, duplicidade), fórmulas, cálculo de preço e dashboard.

## Swagger / OpenAPI

- Interface: **http://localhost:3000/api/docs**
- Contrato JSON: **http://localhost:3000/api/docs-json**

Para testar rotas protegidas: execute `POST /auth/login`, copie o `accessToken` e clique em **Authorize**. Todos os DTOs, parâmetros, respostas e erros estão documentados. O contrato JSON pode ser usado para gerar clientes do frontend e como referência para agentes de IA.

Em produção, desative com `SWAGGER_ENABLED=false` se não quiser a documentação pública.

## Estrutura do projeto

```text
src/
├── auth/                  # Login, logout, /me, perfil, troca e recuperação de senha (JWT)
│   ├── dto/
│   ├── entities/          # Tokens de redefinição de senha
│   ├── mail/              # E-mail de redefinição (HTML + texto)
│   └── strategies/        # Estratégia Passport JWT
├── mail/                  # MailService (contrato) + nodemailer (drivers log e smtp)
├── users/                 # CRUD de usuários (somente ADMIN)
├── products/              # CRUD de produtos
├── quotations/            # Cotações diárias
│   ├── enums/             # Fonte da cotação (MANUAL, LME, OTHER)
│   └── providers/         # Contrato QuotationProvider (futura LmeQuotationService)
├── pricing/               # Fórmulas de precificação
│   └── calculation/       # PricingCalculationService (motor de cálculo)
├── dashboard/             # Totais para os cards do dashboard
├── health/                # Health check (API + banco)
├── common/                # Código compartilhado entre módulos
│   ├── decorators/        # @Public(), @Roles(), @CurrentUser()
│   ├── guards/            # JwtAuthGuard e RolesGuard (globais)
│   ├── filters/           # Formato padrão de erros
│   ├── dto/               # Paginação, status, erro
│   ├── entities/          # AppBaseEntity (id, createdAt, updatedAt)
│   ├── enums/             # Role
│   ├── security/          # PasswordService (bcrypt)
│   ├── swagger/           # Decorators de documentação
│   ├── transformers/      # Normalização de dados de entrada
│   ├── utils/             # Paginação e busca
│   └── validators/        # Política de senha, datas
├── config/                # Validação do .env e opções do TypeORM
├── database/
│   ├── migrations/        # Migrations versionadas
│   ├── seeds/             # Dados de demonstração
│   ├── scripts/           # Criação do banco
│   └── data-source.ts     # DataSource da CLI do TypeORM
├── app.module.ts
├── app.setup.ts           # CORS, validação, erros, Swagger (compartilhado com os testes)
└── main.ts
test/                      # Testes e2e e utilitários de teste
docs/                      # Documentação de arquitetura e roadmap
```

Cada módulo segue o mesmo padrão: `controller` (somente HTTP) → `service` (regras de negócio) → `Repository` do TypeORM (persistência), com `dto/` para entrada e `entities/` para o modelo. Detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e convenções para agentes em [AGENTS.md](AGENTS.md).

## Principais endpoints

Todas as rotas exigem `Authorization: Bearer <token>`, exceto `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password` e `GET /health`.

| Método   | Rota                            | Descrição                                          | Acesso        |
| -------- | ------------------------------- | -------------------------------------------------- | ------------- |
| `POST`   | `/auth/login`                   | Login (retorna JWT)                                | Público       |
| `POST`   | `/auth/forgot-password`         | Pede o link de redefinição de senha por e-mail     | Público       |
| `POST`   | `/auth/reset-password`          | Define a nova senha com o token do e-mail          | Público       |
| `POST`   | `/auth/logout`                  | Encerra a sessão (invalida os tokens do usuário)   | Autenticado   |
| `GET`    | `/auth/me`                      | Usuário autenticado                                | Autenticado   |
| `PATCH`  | `/auth/profile`                 | Atualiza nome/e-mail do próprio usuário            | Autenticado   |
| `PATCH`  | `/auth/password`                | Altera a própria senha (retorna novo token)        | Autenticado   |
| `GET`    | `/users`                        | Lista usuários (`search`, `role`, `active`)        | ADMIN         |
| `GET`    | `/users/:id`                    | Consulta usuário                                   | ADMIN         |
| `POST`   | `/users`                        | Cria usuário                                       | ADMIN         |
| `PATCH`  | `/users/:id`                    | Atualiza usuário                                   | ADMIN         |
| `PATCH`  | `/users/:id/status`             | Ativa/desativa usuário                             | ADMIN         |
| `DELETE` | `/users/:id`                    | Exclui usuário                                     | ADMIN         |
| `GET`    | `/products`                     | Lista/busca produtos (`search`, `active`)          | Autenticado   |
| `GET`    | `/products/:id`                 | Consulta produto                                   | Autenticado   |
| `POST`   | `/products`                     | Cria produto                                       | Autenticado   |
| `PATCH`  | `/products/:id`                 | Atualiza produto                                   | Autenticado   |
| `PATCH`  | `/products/:id/status`          | Ativa/desativa produto                             | Autenticado   |
| `DELETE` | `/products/:id`                 | Exclui produto                                     | ADMIN         |
| `GET`    | `/quotations`                   | Lista cotações (`startDate`, `endDate`, `commodity`, `source`) | Autenticado |
| `GET`    | `/quotations/:id`               | Consulta cotação                                   | Autenticado   |
| `POST`   | `/quotations`                   | Cadastra cotação                                   | Autenticado   |
| `PATCH`  | `/quotations/:id`               | Atualiza cotação                                   | Autenticado   |
| `DELETE` | `/quotations/:id`               | Exclui cotação                                     | ADMIN         |
| `GET`    | `/pricing-formulas`             | Lista fórmulas (`search`, `active`)                | Autenticado   |
| `GET`    | `/pricing-formulas/:id`         | Consulta fórmula                                   | Autenticado   |
| `POST`   | `/pricing-formulas`             | Cria fórmula                                       | Autenticado   |
| `PATCH`  | `/pricing-formulas/:id`         | Atualiza fórmula                                   | Autenticado   |
| `PATCH`  | `/pricing-formulas/:id/status`  | Ativa/desativa fórmula                             | Autenticado   |
| `DELETE` | `/pricing-formulas/:id`         | Exclui fórmula                                     | ADMIN         |
| `GET`    | `/dashboard`                    | Totais para os 4 cards do dashboard                | Autenticado   |
| `GET`    | `/health`                       | Saúde da API e do banco                            | Público       |

**Listagens** são paginadas (`?page=1&limit=20`, máximo 100) e retornam:

```json
{ "data": [], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }
```

**Erros** seguem sempre o mesmo formato:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["email must be an email"],
  "path": "/users",
  "timestamp": "2026-09-26T12:00:00.000Z"
}
```

**Exemplo de login:**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cesar@celke.com.br","password":"123456A#b"}'
```

## Credenciais de demonstração

Criadas pelo seed. **Dados fictícios — apenas para desenvolvimento e demonstração.**

| Papel   | E-mail               | Senha       |
| ------- | -------------------- | ----------- |
| `ADMIN` | cesar@celke.com.br   | `123456A#b` |
| `USER`  | kelly@celke.com.br   | `123456A#b` |

- **ADMIN**: acesso total, incluindo gerenciamento de usuários e exclusões.
- **USER**: consulta, cadastra e edita produtos, cotações e fórmulas; não gerencia usuários nem exclui registros.

Novos papéis podem ser adicionados em `src/common/enums/role.enum.ts` e aplicados às rotas com `@Roles(...)`.

## Recuperação de senha

"Esqueci minha senha" por e-mail, em duas rotas públicas:

1. **`POST /auth/forgot-password`** `{ "email": "..." }` — responde **sempre `204`**, exista ou não um usuário ativo com o e-mail (a API não revela quais e-mails estão cadastrados). Se existir, envia um e-mail com o link `PASSWORD_RESET_URL?token=...`.
2. **`POST /auth/reset-password`** `{ "token": "...", "newPassword": "..." }` — grava a nova senha (mesma política de senha forte do cadastro) e responde `204`. Todos os tokens JWT emitidos antes deixam de valer. Token inválido, expirado ou já usado responde `400` com a mesma mensagem.

Regras:

- o link vale por **1 hora** e pode ser usado **uma única vez**; um pedido novo invalida os links anteriores;
- o banco guarda só o hash (SHA-256) do token, nunca o token em si;
- **limite de pedidos**: 10 por IP e 3 por e-mail a cada 15 minutos; acima disso, `429` com o cabeçalho `Retry-After`. O IP é o do cliente, mesmo atrás do proxy da hospedagem (`TRUST_PROXY`). Os contadores ficam em memória — reiniciar a API os zera;
- continuam valendo a troca da própria senha (`PATCH /auth/password`) e a redefinição por um ADMIN (`PATCH /users/:id` com `password`).

O frontend precisa de uma tela no endereço de `PASSWORD_RESET_URL` que leia o parâmetro `token` da URL e chame `POST /auth/reset-password`.

### Em desenvolvimento: driver `log`

Com `MAIL_DRIVER=log` (padrão), nada é enviado: o e-mail aparece no log da API, com o link pronto para abrir no navegador. É o modo de desenvolvimento, testes e CI — não precisa de nenhuma outra variável.

### Em homolog e produção: configurar o SMTP

O envio usa SMTP com [nodemailer](https://nodemailer.com/), sem código específico de provedor: trocar de provedor ou de remetente é só trocar as variáveis no painel da hospedagem.

```env
MAIL_DRIVER=smtp
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@seudominio.com.br
SMTP_PASSWORD=<senha da caixa de e-mail>
MAIL_FROM=no-reply@seudominio.com.br
MAIL_FROM_NAME=Gestão Comercial e Precificação
PASSWORD_RESET_URL=https://front.uno.com/redefinir-senha
```

- Com `MAIL_DRIVER=smtp`, as variáveis `SMTP_*`, `MAIL_FROM` e `PASSWORD_RESET_URL` são **obrigatórias**: se faltar alguma, a aplicação não sobe e o log diz qual (sem exibir a senha).
- **Porta e `SMTP_SECURE`**: `465` + `true` (TLS direto) ou `587` + `false` (STARTTLS). Use os valores que o provedor indicar. Exemplos de servidor: Hostinger `smtp.hostinger.com`, Gmail/Google Workspace `smtp.gmail.com` (com senha de app), Amazon SES `email-smtp.<região>.amazonaws.com`.
- **Remetente**: use em `MAIL_FROM` um endereço do mesmo domínio da conta SMTP (em geral o próprio `SMTP_USER`) e configure SPF/DKIM do domínio no provedor, para que o e-mail não caia no spam.
- **`PASSWORD_RESET_URL`** é a tela de redefinição do frontend **de cada ambiente** (develop, homolog, produção). Não confunda com `FRONTEND_URL`, que é a lista de origens do CORS.
- Se a hospedagem tiver mais de um proxy na frente da API (ex.: uma CDN antes do proxy da Hostinger), ajuste `TRUST_PROXY` para o número de proxies; senão, o limite por IP passa a contar o IP do proxy e não o do cliente.
- Se o envio falhar (SMTP fora do ar, senha errada), a rota continua respondendo `204` e o erro aparece no log da API como `Falha ao processar um pedido de redefinição de senha`.

Para testar a configuração, faça um pedido para o seu próprio e-mail em `POST /auth/forgot-password` pelo Swagger e confira a caixa de entrada (e o log da API, se não chegar).

## Ambientes e branches

Cada ambiente é publicado automaticamente a partir de uma branch do GitHub:

| Ambiente | Branch    | URL da API                | Swagger                            |
| -------- | --------- | ------------------------- | ---------------------------------- |
| Develop  | `develop` | https://dev-api.celke.uno | https://dev-api.celke.uno/api/docs |
| Homolog  | `homolog` | https://hml-api.celke.uno | https://hml-api.celke.uno/api/docs |
| Produção | `main`    | https://api.celke.uno     | https://api.celke.uno/api/docs     |

Fluxo de desenvolvimento:

```text
feature/<tarefa> ──PR──▶ develop ──PR──▶ homolog ──PR──▶ main
```

- **`develop`** — integração das tarefas concluídas. Toda branch de tarefa é criada a partir dela.
- **`homolog`** — testes humanos antes da liberação.
- **`main`** — produção.

Ninguém, nem pessoas nem agentes de IA, faz commit diretamente em `develop`, `homolog` ou `main`: o trabalho acontece em uma branch própria e chega às demais por Pull Request.

## Produção (Hostinger)

A aplicação é um app Node.js padrão, compatível com o **Hostinger Web Application Hosting** (ou qualquer plataforma Node.js). Os passos abaixo valem para os três ambientes; mudam apenas os valores das variáveis (veja [Configuração recomendada por ambiente](#migrations-e-seeds-no-deploy-automático)).

1. **Banco**: crie um banco MySQL e um usuário no painel da Hostinger. A aplicação deve se conectar com `DB_HOST=127.0.0.1` e `DB_PORT=3306` (use `127.0.0.1`, não `localhost`).
2. **Variáveis de ambiente**: cadastre no painel (não envie o `.env` ao repositório):
   ```env
   NODE_ENV=production
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=<banco>
   DB_USERNAME=<usuario>
   DB_PASSWORD=<senha>
   DB_MIGRATIONS_RUN=true
   DB_SEED_ON_STARTUP=false   # true apenas em develop e homolog
   ADMIN_NAME=<nome do administrador>          # apenas até o primeiro acesso
   ADMIN_EMAIL=<e-mail do administrador>
   ADMIN_PASSWORD=<senha forte, só você conhece>
   JWT_SECRET=<segredo forte e exclusivo de produção>
   JWT_EXPIRES_IN=1d
   FRONTEND_URL=https://front.uno.com
   SWAGGER_ENABLED=true
   TRUST_PROXY=1
   MAIL_DRIVER=smtp
   SMTP_HOST=<servidor SMTP>
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=<usuario SMTP>
   SMTP_PASSWORD=<senha SMTP>
   MAIL_FROM=<remetente, ex.: no-reply@seudominio.com.br>
   MAIL_FROM_NAME=Gestão Comercial e Precificação
   PASSWORD_RESET_URL=https://front.uno.com/redefinir-senha
   ```
   Detalhes do e-mail em [Recuperação de senha](#em-homolog-e-produção-configurar-o-smtp).
   A porta (`PORT`) normalmente é fornecida pela plataforma.
3. **Build e start**:
   - Configuração predefinida: **NestJS**
   - Gerenciador de pacotes: `npm`
   - Comando de build: `npm run build`
   - Diretório de saída: `dist` · Arquivo de entrada: `main.js`

   O build roda no servidor e usa ferramentas que são devDependencies (Nest CLI e TypeScript). Como `NODE_ENV=production` faria o npm ignorá-las, o arquivo `.npmrc` do projeto (`include=dev`) garante que sejam instaladas. **Não remova o `.npmrc`**: sem ele, o deploy falha com `nest: command not found`.
4. **Migrations e seeds**: veja a seção abaixo. Não é necessário executar comandos no servidor.
5. **Verificação**: `GET /health` deve retornar `{"status":"ok","database":"up"}`.

### Migrations e seeds no deploy automático

No deploy automático (a Hostinger detecta o push no GitHub, executa a build e reinicia a aplicação), **a build não acessa o banco**: ela apenas compila o código para `dist/`, incluindo as migrations. O banco é atualizado **quando a aplicação inicia**, na seguinte ordem:

1. **Migrations** — com `DB_MIGRATIONS_RUN=true`, o TypeORM aplica as migrations pendentes ao conectar. Migrations já aplicadas (registradas na tabela `migrations`) não são repetidas. Se uma migration falhar, a aplicação **não sobe** e o erro aparece nos logs de execução.
2. **Administrador inicial** — se as variáveis `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` estiverem definidas e **não existir nenhum usuário ADMIN**, esse administrador é criado. Se já existir um ADMIN, as variáveis são ignoradas.
3. **Seeds** — com `DB_SEED_ON_STARTUP=true`, os seeds de demonstração são executados logo em seguida. Como são idempotentes, reiniciar a aplicação não duplica registros.
4. A API passa a responder às requisições.

Configuração recomendada por ambiente:

| Ambiente                   | `DB_MIGRATIONS_RUN`                   | `DB_SEED_ON_STARTUP`         | `ADMIN_*`                        |
| -------------------------- | ------------------------------------- | ---------------------------- | -------------------------------- |
| Desenvolvimento local      | `false` (use `npm run migration:run`) | `false` (use `npm run seed`) | não usar (o seed já cria o ADMIN) |
| Develop (`develop`)        | `true`                                | `true`                       | opcional                         |
| Homolog (`homolog`)        | `true`                                | `true`                       | opcional                         |
| Produção (`main`)          | `true`                                | `false`                      | até o primeiro acesso            |

Os seeds criam os usuários de demonstração com a senha `123456A#b`: **mantenha `DB_SEED_ON_STARTUP=false` em produção**. Com acesso SSH, as alternativas manuais são `npm run migration:run:prod` e `npm run seed:prod -- --force`.

#### Primeiro acesso em produção

Em produção o banco começa vazio e sem dados de demonstração. Para criar o primeiro administrador sem acessar o servidor:

1. No painel da Hostinger, cadastre `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` (senha forte, conhecida apenas por você).
2. Faça o deploy (ou reinicie a aplicação). O log exibirá `Administrador inicial criado`.
3. Entre no sistema com esse e-mail e senha e cadastre os demais usuários pela tela de Usuários.
4. **Remova as três variáveis do painel.** Mesmo que continuem lá, elas não têm efeito enquanto existir um ADMIN, e a senha nunca é sobrescrita (trocá-la pelo sistema continua valendo).

Regras de segurança:

- a senha fica apenas nas variáveis de ambiente da hospedagem, nunca no código ou no GitHub;
- se apenas parte das variáveis for informada, ou se a senha não atender à política de senha forte, a aplicação não sobe e o log indica o problema (sem exibir a senha);
- se o e-mail já pertencer a um usuário comum, a aplicação não sobe em vez de promovê-lo a administrador;
- não é um mecanismo de recuperação de senha (para isso, veja [Recuperação de senha](#recuperação-de-senha)): só atua enquanto não existe nenhum administrador.

Checklist de segurança para produção: `JWT_SECRET` exclusivo e forte, `DB_SEED_ON_STARTUP=false`, variáveis `ADMIN_*` removidas após o primeiro acesso, `FRONTEND_URL` restrito aos domínios reais, `MAIL_DRIVER=smtp` com `PASSWORD_RESET_URL` apontando para o frontend de produção e HTTPS habilitado.

## Scripts disponíveis

| Script                        | Descrição                                          |
| ----------------------------- | -------------------------------------------------- |
| `npm run dev`                 | Desenvolvimento com reload automático              |
| `npm run build`               | Compila para `dist/`                               |
| `npm run start`               | Executa a versão compilada                         |
| `npm run test`                | Testes unitários                                   |
| `npm run test:cov`            | Testes unitários com cobertura                     |
| `npm run test:e2e`            | Testes e2e (MySQL)                                 |
| `npm run lint` / `lint:fix`   | ESLint (verificar / corrigir)                      |
| `npm run format`              | Prettier                                           |
| `npm run db:create`           | Cria o banco `DB_DATABASE`                         |
| `npm run db:setup`            | Cria o banco, aplica migrations e executa o seed   |
| `npm run migration:*`         | `run`, `revert`, `show`, `generate`, `create`      |
| `npm run seed`                | Dados de demonstração                              |
| `npm run migration:run:prod`  | Migrations a partir do build (produção)            |
| `npm run seed:prod`           | Seed a partir do build (produção, exige `--force`) |

## Autor

Desenvolvido por [Cesar Szpak](https://celke.com.br) — [Celke
Cursos](https://github.com/celkecursos).

## Licença

MIT — veja o arquivo [LICENSE](LICENSE.txt) para detalhes.
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

Cobertura atual: autenticação (login, logout, perfil, troca de senha), criação e validação de usuários, permissões por papel, produtos, cotações (filtros, datas, duplicidade), fórmulas, cálculo de preço e dashboard.

## Swagger / OpenAPI

- Interface: **http://localhost:3000/api/docs**
- Contrato JSON: **http://localhost:3000/api/docs-json**

Para testar rotas protegidas: execute `POST /auth/login`, copie o `accessToken` e clique em **Authorize**. Todos os DTOs, parâmetros, respostas e erros estão documentados. O contrato JSON pode ser usado para gerar clientes do frontend e como referência para agentes de IA.

Em produção, desative com `SWAGGER_ENABLED=false` se não quiser a documentação pública.

## Estrutura do projeto

```text
src/
├── auth/                  # Login, logout, /me, perfil e troca de senha (JWT)
│   ├── dto/
│   └── strategies/        # Estratégia Passport JWT
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

Todas as rotas exigem `Authorization: Bearer <token>`, exceto `POST /auth/login` e `GET /health`.

| Método   | Rota                            | Descrição                                          | Acesso        |
| -------- | ------------------------------- | -------------------------------------------------- | ------------- |
| `POST`   | `/auth/login`                   | Login (retorna JWT)                                | Público       |
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

> **Esta funcionalidade ainda não foi implementada.**

A recuperação de senha por e-mail ("Esqueci minha senha") será adicionada posteriormente como uma **tarefa de desenvolvimento através do Paperclip**, executada por um agente de IA.

Hoje o sistema oferece apenas:

- troca da própria senha por um usuário autenticado (`PATCH /auth/password`);
- redefinição da senha de um usuário por um ADMIN (`PATCH /users/:id` com `password`).

A base já está preparada para essa funcionalidade — veja os pontos de extensão em [docs/ROADMAP.md](docs/ROADMAP.md#recuperação-de-senha-por-e-mail).

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
   ```
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
- não é um mecanismo de recuperação de senha: só atua enquanto não existe nenhum administrador.

Checklist de segurança para produção: `JWT_SECRET` exclusivo e forte, `DB_SEED_ON_STARTUP=false`, variáveis `ADMIN_*` removidas após o primeiro acesso, `FRONTEND_URL` restrito aos domínios reais e HTTPS habilitado.

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

## Recuperação de senha

A recuperação usa dois endpoints públicos:

- `POST /auth/forgot-password` com `{ "email": "usuario@empresa.com.br" }`. A resposta é sempre genérica, exista ou não a conta. Há limite de 5 solicitações por e-mail e IP a cada 15 minutos.
- `POST /auth/reset-password` com `{ "token": "...", "newPassword": "NovaSenha@2026" }`. O token expira, é de uso único e uma nova solicitação invalida tokens anteriores.

A API persiste somente o hash SHA-256 do token. Configure `FRONTEND_RESET_PASSWORD_URL` e `PASSWORD_RESET_TOKEN_TTL_MINUTES` (padrão: 30). O envio usa `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM`. Em produção, a configuração SMTP é obrigatória; fora de produção, sem SMTP configurado, o link é registrado no log.

O limite de solicitações considera o IP original encaminhado pelo primeiro proxy confiável da Hostinger (`trust proxy = 1`).

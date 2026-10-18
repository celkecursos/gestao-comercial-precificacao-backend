---
paths:
  - 'test/**'
  - 'src/**/*.controller.ts'
description: Padrão dos testes e2e (Jest + Supertest) — organização por módulo, app e login por arquivo, matriz de permissão, dado único e o que conferir na resposta. Carrega ao tocar test/ ou um controller.
---

# Testes e2e — o padrão do projeto

Os testes e2e sobem o `AppModule` de verdade e batem nas rotas via Supertest contra um
**MySQL real**. Não há mock. O banco de testes (`DB_TEST_DATABASE`, padrão
`<DB_DATABASE>_test`) é apagado e recriado **uma vez por execução** pelo
`test/setup/global-setup.ts` (migrations + seed) e é **compartilhado por todos os
arquivos**, que rodam em sequência (`--runInBand`). Aqui fica **como escrever** um teste.

## Onde cada coisa vive

```
test/
  jest-e2e.json
  setup/                   # globalSetup + ambiente — NÃO MEXA (ver abaixo)
  utils/                   # mocks dos testes UNITÁRIOS (repository.mock.ts) — não é e2e
  support/                 # utilitários de TODOS os módulos: subir o app, login, bearer, STAMP
  <assunto>.e2e-spec.ts    # só o que não pertence a módulo nenhum (ex.: contrato Swagger)
  <modulo>/                # uma pasta por pasta de src/ que tem controller
    <fluxo>.e2e-spec.ts    # crud.e2e-spec.ts, access.e2e-spec.ts, login.e2e-spec.ts...
    <modulo>.helpers.ts    # só quando 2+ arquivos do módulo repetirem o mesmo trecho
```

- `<modulo>` é **o nome da pasta em `src/`** (`auth`, `users`, `products`, `quotations`,
  `pricing`, `dashboard`, `health`) — nunca um apelido. `pricing-formulas` vive em `pricing/`.
- O nome do arquivo **não repete o módulo**: `products/crud.e2e-spec.ts`, não
  `products/products-crud.e2e-spec.ts`.
- Helper **nasce quando repete**, não antes. Helper e `support/` **nunca** terminam em
  `.e2e-spec.ts` (o Jest coletaria como teste).
- Código em inglês; títulos de `describe`/`it`, comentários e mensagens em português
  (mesma convenção do `AGENTS.md`).

## Cada arquivo é independente

- Cada arquivo **sobe o próprio app** e **faz o próprio login** no `beforeAll`, usando
  `test/support/` (`createTestApp()`, `login()`, `bearer()`), e fecha o app no `afterAll`.
- **Nenhum** arquivo depende de outro, nem da ordem de execução, nem de dado criado por
  outro arquivo. Dentro do arquivo, um `it` também não depende de outro: estado comum nasce
  no `beforeAll`. Fluxo que é uma sequência real (cria → edita → exclui) fica num `it` só.
- Credenciais do seed vêm de `src/database/seeds/seed-data.ts` (`DEMO_PASSWORD`, e-mails
  do ADMIN e do USER) via `test/support/` — nunca senha literal espalhada pelos arquivos.

## Matriz de permissão — obrigatória

**Toda rota** tem, no mínimo, os três casos: **sem token**, **USER** e **ADMIN**.

| Rota             | sem token                 | USER                         | ADMIN   |
| ---------------- | ------------------------- | ---------------------------- | ------- |
| privada          | 401                       | sucesso                      | sucesso |
| `@Roles(Admin)`  | 401                       | **403**                      | sucesso |
| `@Public()`      | sucesso (ou 401 de login) | mesmo resultado              | idem    |

- O lugar natural é `<modulo>/access.e2e-spec.ts` com `it.each` sobre as rotas do
  controller. Os casos de sucesso podem ficar no arquivo do fluxo, desde que **os três
  perfis** apareçam para toda rota em algum arquivo do módulo.
- Rota com `:id` no caso 403/401 usa um id **real** criado pelo próprio arquivo — senão um
  404 mascara a falta de guard.

## Funcionalidade nova exige e2e

Rota nova, regra de perfil nova ou mudança de contrato num `*.controller.ts` vem com o e2e
**no mesmo PR**: a matriz de permissão da rota e o fluxo feliz + os erros de negócio
(404, 409, 400 de regra do service). Para criar: `/criar-teste-e2e <modulo>`.

## Dado de teste

- Identificador **único em runtime**, com prefixo `e2e-`:
  `const STAMP = Date.now().toString().slice(-8)` → `e2e-${STAMP}@empresa.com.br`,
  `E2E Produto ${STAMP}`, código `e2e-${STAMP}` (a API devolve em maiúsculas: `E2E-…`).
  O prefixo permite achar resíduo e evita colisão entre arquivos.
- **Nunca** conte valores absolutos de tabelas compartilhadas (`meta.total`, cards do
  dashboard, tamanho de listagem sem filtro): outros arquivos criam dados no mesmo banco.
  Use **delta** — leia antes, aja, leia depois, `expect(depois).toBe(antes + 1)` — ou filtre
  a listagem pelo `STAMP` do próprio arquivo.
- Dado do seed é **só leitura**. Não edite, desative nem exclua registro do seed.
- Não precisa de `afterAll` de limpeza: o banco é recriado a cada execução. Exclusão só
  entra quando é parte do fluxo testado.

## Usuários do seed — intocáveis

**Nunca** troque a senha, faça logout, altere o perfil/status ou edite os usuários do seed
(ADMIN `cesar@celke.com.br`, USER `kelly@celke.com.br`): o backend incrementa o
`tokenVersion` e **invalida os tokens** desses usuários para o resto da suíte. Fluxo de
logout, troca de senha, perfil próprio ou desativação **cria o próprio usuário** (com
`STAMP`) e faz login com ele.

## O que conferir: status E corpo

- Status sozinho não basta. Sucesso: `toMatchObject` com os campos relevantes (incluindo
  normalizações que a API faz, ex.: código em maiúsculas, `source: 'MANUAL'`).
- Erro: o formato do `AllExceptionsFilter` —
  `{ statusCode, error, message, path, timestamp }`. Erro de negócio confere a `message`
  exata em português; erro de validação (400) confere que `message` é array.
- Toda resposta que carrega usuário (login, `/auth/me`, `/users`, perfil) confere a
  **ausência** de `password` e `tokenVersion` — em listagens, em **cada** item.
- Asserção negativa precisa de âncora: antes de `not.toContain(...)` numa lista, prove que
  ela veio com o que deveria (ex.: contém o item do próprio arquivo).

## Não toque em `test/setup/`

`e2e-env.ts` e `global-setup.ts` garantem que o e2e roda **só** no banco de testes e o
recriam do zero. Não mude, não importe de lá nos specs e não recrie o banco num spec. Se
um teste precisa de outro estado inicial, ele cria esse estado pela API.

## O que NÃO é e2e

Cálculo (precificação, fórmulas), normalização e validação **campo a campo** de DTO ficam
no teste **unitário** (`src/**/*.spec.ts`). O e2e prova uma vez que a validação está ligada
(um payload inválido → 400 com `message` array) e cobre o que só ele alcança — guards e
perfis, contrato HTTP real, filtro de exceções, persistência e constraints do MySQL.

## Verificação

```bash
docker compose up -d mysql
npm run test:e2e -- test/<modulo>   # o módulo
npm run test:e2e                    # a suíte inteira (prova a independência entre arquivos)
npm run lint && npm run format:check
```

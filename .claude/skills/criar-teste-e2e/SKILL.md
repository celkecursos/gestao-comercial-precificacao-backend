---
name: criar-teste-e2e
description: Cria ou amplia os testes e2e (Jest + Supertest) de um módulo do backend seguindo o padrão do projeto — test/<modulo>/<fluxo>.e2e-spec.ts — e migra o trecho correspondente do test/app.e2e-spec.ts. Use quando pedirem "teste e2e", "teste ponta a ponta" ou "/criar-teste-e2e <modulo|todos>".
argument-hint: <modulo|todos> [fluxo]
---

# Criar teste e2e de um módulo

Argumento: `$ARGUMENTS` — o módulo (nome da pasta em `src/`) ou `todos`; opcionalmente,
o fluxo.

O **padrão** (organização, independência, matriz de permissão, dado de teste) está em
`.claude/rules/e2e.md` — leia antes de escrever. Esta skill é o **processo**.

## 1. Entender o módulo antes de escrever

Leia, nesta ordem:

1. `src/<modulo>/*.controller.ts` — cada rota: método, caminho, `@Public()`,
   `@Roles(...)`, `@HttpCode`, params/query e `@ApiErrorResponses(...)`. Monte a lista de
   rotas: é a base da matriz de permissão.
2. `src/<modulo>/dto/` — campos obrigatórios, normalizações (`@Transform`, maiúsculas) e o
   formato de resposta.
3. `src/<modulo>/*.service.ts` — erros de negócio (`NotFound`, `Conflict`,
   `BadRequest`) com a mensagem exata, exclusão física ou lógica, efeitos colaterais
   (ex.: `tokenVersion`).
4. `src/database/seeds/seed-data.ts` — o que o seed já cria para o módulo (só leitura) e
   os usuários ADMIN/USER.
5. O `describe` do módulo em `test/app.e2e-spec.ts`, se existir — tudo que ele cobre
   precisa continuar coberto depois da migração.

## 2. Propor os arquivos

Antes de escrever, apresente ao usuário a lista, por exemplo:

- `test/<modulo>/access.e2e-spec.ts` — matriz sem token / USER / ADMIN de **todas** as
  rotas (`it.each`).
- `test/<modulo>/crud.e2e-spec.ts` — ciclo completo num `it`: cria, busca pelo `STAMP`,
  erro de negócio (409/404), edita, ativa/desativa, exclui.
- fluxos específicos do módulo (ex.: `auth/password.e2e-spec.ts`, `quotations/filters.e2e-spec.ts`).

Um arquivo por fluxo, não um arquivo gigante por módulo. Diga também o que fica **fora**
(cálculo, validação campo a campo → unitário).

## 3. Criar `test/support/` se não existir

Só utilitários, nenhum arquivo `.e2e-spec.ts`:

- `test/support/app.ts` — `createTestApp()`: `Test.createTestingModule({ imports: [AppModule] })`,
  `createNestApplication()`, `configureApp(app)` (de `src/app.setup`), `app.init()`.
- `test/support/auth.ts` — e-mails do ADMIN e do USER do seed, `login(app, email, password = DEMO_PASSWORD)`
  que confere 200 e devolve o `accessToken`, e `bearer(token)`.
- `test/support/data.ts` — `stamp()` para o identificador único com prefixo `e2e-`.

Esqueleto de um arquivo:

```ts
/**
 * Cobre: ...
 * Não cobre: ... (unitário)
 * Dado criado: produtos `e2e-<STAMP>`.
 */
describe('Produtos — CRUD', () => {
  const STAMP = stamp();
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, SEED_ADMIN_EMAIL);
    userToken = await login(app, SEED_USER_EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('...', async () => { /* status E corpo */ });
});
```

## 4. Escrever e migrar

- Escreva os arquivos propostos seguindo a rule.
- **Mova** o `describe` do módulo para fora de `test/app.e2e-spec.ts`: tudo que ele cobria
  passa a existir nos novos arquivos (adaptado ao padrão — `STAMP`, delta, usuário próprio
  em vez do seed) e o trecho é **removido** do arquivo antigo.
- O que sobra no `app.e2e-spec.ts` tem de continuar passando. Cuidado com as duas
  dependências que ele tem hoje:
  - os `adminToken`/`userToken` dos demais `describe` nascem dentro do `it` de
    "Autenticação" — ao mover `auth`, passe esse login para o `beforeAll` do arquivo antigo;
  - o teste do dashboard conta valores **absolutos** e quebra assim que outro arquivo cria
    dados — se ele ainda estiver lá, migre `dashboard` (com delta) antes ou junto.
- Não mexa em `test/setup/` nem em `test/utils/`.

## 5. Verificar

```bash
npm run test:e2e -- test/<modulo>   # o módulo passa
npm run test:e2e                    # a suíte inteira passa (independência + app.e2e-spec restante)
npm run lint && npm run format:check
```

O MySQL precisa estar no ar (`docker compose up -d mysql`). Se um teste falhar, leia a
resposta antes de mexer: pode ser **bug real** da API (guard faltando, status errado,
`password` vazando). Bug real não se contorna no teste — avise o usuário com a rota, o
esperado e o obtido.

## Modo `todos`

Um módulo por vez, na ordem abaixo, e **só avance quando o módulo atual e a suíte inteira
passarem** (passo 5) — não escreva o próximo antes:

1. `dashboard` — tira do arquivo antigo a contagem absoluta que quebraria com os demais.
2. `auth` — antes de remover, leve o login dos tokens para o `beforeAll` do arquivo antigo.
3. `users`, `products`, `quotations`, `pricing`, `health`.
4. O que não é de módulo (contrato `/api/docs-json`) → `test/swagger.e2e-spec.ts`.

No fim, com o `test/app.e2e-spec.ts` vazio de casos, **apague-o**, rode a suíte inteira,
`lint` e `format:check` mais uma vez, e resuma ao usuário os arquivos criados, o que cada
um cobre e os achados.

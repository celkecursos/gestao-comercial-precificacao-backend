---
paths:
  - 'src/**/*.ts'
description: Padrão dos testes unitários (Jest) — arquivo ao lado do código, três moldes com referência, exceções do service, regras numéricas em tabela e o que mockar. Carrega ao tocar src/.
---

# Testes unitários — o padrão do projeto

Os unitários rodam com `npm run test` (Jest, `rootDir: src`, `*.spec.ts`), sem banco e sem
HTTP. Cobrem a **regra**: ramos do service, cálculo, validação e normalização de DTO. O
que depende de guard, filtro de exceção, rota ou MySQL é e2e (`.claude/rules/e2e.md`).

## Onde cada coisa vive

- O spec fica **ao lado do código**, com o mesmo nome + `.spec.ts`:
  `src/users/users.service.ts` → `src/users/users.service.spec.ts`,
  `src/users/dto/create-user.dto.ts` → `src/users/dto/create-user.dto.spec.ts`.
- Um `describe` com o nome da classe; um `describe` aninhado por método quando o método
  tem mais de um caso.
- Código em inglês; títulos de `describe`/`it` e comentários em português, dizendo a regra
  ("rejeita e-mail já cadastrado"), não a implementação ("chama findOneBy").
- Mock compartilhado entre módulos vive em `test/utils/` (hoje: `repository.mock.ts`). Não
  recrie um mock de `Repository` à mão num spec.

## Os três moldes — escolha um e copie a referência

| O que é testado | Molde | Referência |
| --- | --- | --- |
| Service com dependências (repositório, outro service) | `Test.createTestingModule` com o service **real** e as dependências por `useValue`; repositório via `createRepositoryMock<Entidade>()` + `getRepositoryToken(Entidade)`; mocks recriados no `beforeEach` | `src/users/users.service.spec.ts` + `test/utils/repository.mock.ts` |
| Classe pura (sem dependências injetadas) | `new Classe()` direto, sem módulo de teste | `src/pricing/calculation/pricing-calculation.service.spec.ts` |
| DTO | `plainToInstance` + `validate`; helper local `validateDto()` que devolve `{ dto, invalidFields }`; um `validPayload` e variações com spread | `src/users/dto/create-user.dto.spec.ts` |

- Fábrica de entidade no topo do spec (`existingUser(overrides)` com
  `Object.assign(new Entidade(), {...})`) em vez de objetos literais repetidos.
- DTO: confira **quais campos** falharam (`invalidFields` com `toEqual`), não só que
  falhou; e confira a normalização (`trim`, maiúsculas/minúsculas) no `dto` resultante.

## Toda exceção do service é testada

Para **cada** `throw` do service (e cada exceção que ele deixa passar de propósito):

1. O **tipo** da exceção — `rejects.toThrow(ConflictException)` — ou a **mensagem exata**
   quando ela é o contrato com o usuário (`rejects.toThrow('Você não pode desativar a si mesmo.')`).
2. **Nada foi gravado** — `expect(repository.save).not.toHaveBeenCalled()` (e `update`,
   `remove`, `increment`, ou o método da dependência que alteraria estado).

Em código síncrono: `expect(() => ...).toThrow(...)`.

## Regra numérica: tabela com `it.each` e bordas obrigatórias

Cálculo, arredondamento, percentual, intervalo de datas, paginação e limites vão numa
**tabela** `it.each` — uma linha por caso, entrada e saída esperada lado a lado, com um
rótulo que diz o caso:

```ts
it.each([
  ['margem zero', { ...base, marginPercent: 0 }, 3500],
  ['arredonda para 4 casas', { ...base, rawMaterialCost: 0.1 }, 0.675],
])('calcula o preço final (%s)', (_case, input, expected) => {
  expect(service.calculate(input).finalPrice).toBe(expected);
});
```

Bordas **obrigatórias** na tabela: **zero**, **negativo** (rejeitado ou não), o **limite**
exato e um acima/abaixo dele, **casas decimais/arredondamento** e lista **vazia** quando
houver lista. Decimal se compara com `toBe` quando o código arredonda; sem arredondamento,
`toBeCloseTo`.

> O arquivo de referência de classe pura ainda usa `it` separados para o cálculo — código
> novo (e qualquer ampliação dele) segue a tabela.

## Mocke só a fronteira

- Mock **apenas** o que está fora da unidade: repositório do TypeORM, outros services
  injetados, `JwtService`, `PasswordService`/bcrypt, relógio (`jest.useFakeTimers` quando a
  regra depende da data).
- **Nunca** mocke, espione ou substitua método do **próprio** service sob teste
  (`jest.spyOn(service, 'findOne')`): monte o retorno do repositório para que o método real
  siga o ramo desejado.
- Mock devolve o **mínimo** que o ramo precisa; `mockResolvedValueOnce` em sequência quando
  o método consulta o repositório mais de uma vez (comente qual chamada é qual).
- Asserção sobre a chamada da fronteira (`toHaveBeenCalledWith`) só quando o efeito **é** a
  regra (hash gravado, `tokenVersion` incrementado) — não para reproduzir a implementação.

## Verificação

```bash
npm run test -- <modulo>/<arquivo>.spec.ts
npm run test:cov -- <modulo>/<arquivo>.spec.ts --collectCoverageFrom=<modulo>/<arquivo>.ts
npm run lint && npm run format:check
```

Os caminhos são relativos a `src/` (o `rootDir` do Jest). Linha não coberta no relatório =
ramo sem caso: cubra ou justifique.

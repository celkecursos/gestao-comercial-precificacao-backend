---
name: criar-teste-unitario
description: Cria ou amplia os testes unitários (Jest) de um módulo do backend seguindo o padrão do projeto — spec ao lado do código, no molde certo (service com dependências, classe pura ou DTO). Use quando pedirem "teste unitário", "cobrir o service/DTO" ou "/criar-teste-unitario <modulo>".
argument-hint: <modulo> [arquivo]
---

# Criar teste unitário

Argumento: `$ARGUMENTS` — o módulo (nome da pasta em `src/`) e, opcionalmente, o arquivo
(ex.: `users users.service.ts`, `pricing calculation/pricing-calculation.service.ts`).
Sem arquivo: todos os services, classes puras e DTOs do módulo, um por vez.

O **padrão** (moldes, exceções, tabela, o que mockar) está em `.claude/rules/unit-tests.md`
— leia antes de escrever. Esta skill é o **processo**.

## 1. Listar os ramos do código

Para cada arquivo alvo, leia o código e o spec existente (se houver) e liste:

- cada método público e cada **ramo** dele (`if`, `??`, ternário, `try/catch`, early return);
- cada `throw` — tipo da exceção, mensagem e o que **não** deve ser gravado nesse caso;
- cada regra numérica (cálculo, arredondamento, percentual, limite, período) e suas bordas;
- no DTO: cada decorator de validação, cada `@Transform` e os campos opcionais;
- as dependências injetadas — são elas (e só elas) que serão mockadas.

Marque o que o spec atual já cobre. Se quiser o mapa real, rode o `test:cov` do arquivo
(passo 4) antes de começar: as linhas não cobertas apontam os ramos sem caso.

## 2. Propor a tabela de casos — antes de escrever

Apresente ao usuário, por arquivo, o molde escolhido e a tabela:

| Método / campo | Caso | Entrada (mínima) | Esperado | Já coberto? |
| --- | --- | --- | --- | --- |
| `create` | e-mail duplicado | `findOneBy` → usuário | `ConflictException`, `save` não chamado | sim |
| `calculate` | margem zero | `marginPercent: 0` | `finalPrice = totalCost` | não |

Inclua todas as exceções, as bordas obrigatórias das regras numéricas (zero, negativo,
limite ±1, arredondamento, lista vazia) e o que fica **fora** (guard, rota, constraint do
MySQL → e2e). Espere o ok do usuário, ou ajuste, antes do passo 3.

## 3. Escrever no molde certo

- Service com dependências → copie a estrutura de `src/users/users.service.spec.ts`
  (`createRepositoryMock` de `test/utils/repository.mock.ts`, `beforeEach` recriando os
  mocks, fábrica de entidade no topo).
- Classe pura → `new Classe()`, como em
  `src/pricing/calculation/pricing-calculation.service.spec.ts`, com as regras numéricas em
  `it.each`.
- DTO → `validateDto()` + `validPayload`, como em `src/users/dto/create-user.dto.spec.ts`.
- Spec já existe? **Amplie** o arquivo, mantendo a organização dele; não crie um segundo
  spec para o mesmo arquivo.
- Achou um ramo que só se testa espionando o próprio service ou com mock de algo interno?
  Pare e avise: provavelmente a regra está no lugar errado — não force o teste.

## 4. Rodar

```bash
npm run test -- <modulo>/<arquivo>.spec.ts
npm run test:cov -- <modulo>/<arquivo>.spec.ts --collectCoverageFrom=<modulo>/<arquivo>.ts
npm run lint && npm run format:check
```

Caminhos relativos a `src/`. Confira no relatório de cobertura que as linhas da tabela
foram exercitadas; linha descoberta que sobrar precisa de caso ou de justificativa no
resumo. Teste que falha por **bug real** do código não se ajusta para passar — avise o
usuário com o caso, o esperado e o obtido.

Por fim, rode `npm run test` inteiro e resuma: arquivos criados/ampliados, casos novos e a
cobertura antes/depois de cada arquivo.

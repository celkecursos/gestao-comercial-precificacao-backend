**Prompt 1: rules e skills de e2e**
```
Crie o padrão de testes e2e deste backend, seguindo a mesma ideia do frontend
(../gestao-comercial-precificacao-frontend/.claude/rules/e2e.md e
.claude/skills/criar-teste-e2e/SKILL.md), adaptado para Jest + Supertest:

1. .claude/rules/e2e.md (paths: test/**, src/**/*.controller.ts):
   - uma pasta por módulo de src/ e um arquivo por fluxo: test/<modulo>/<fluxo>.e2e-spec.ts
   - cada arquivo sobe o próprio app e faz o próprio login (test/support/), sem depender
     de outro arquivo nem da ordem
   - matriz de permissão obrigatória: toda rota com caso sem token, USER e ADMIN
   - funcionalidade nova em controller exige e2e no mesmo PR
   - dado único com STAMP e prefixo e2e-; nunca contar valores absolutos de tabelas
     compartilhadas (usar delta antes/depois)
   - nunca trocar senha nem fazer logout com os usuários do seed
   - conferir status E corpo (formato de erro, ausência de password/tokenVersion)
   - não tocar em test/setup/
   - o que não é e2e: cálculo e validação campo a campo ficam no unitário
2. .claude/skills/criar-teste-e2e/SKILL.md com argumento <modulo|todos> [fluxo]:
   entender (controller, DTOs, service, seed) → propor os arquivos → criar
   test/support/ se não existir → mover o describe do módulo de test/app.e2e-spec.ts →
   rodar o módulo e a suíte inteira → lint e format:check. No modo "todos", um módulo
   por vez, rodando os testes antes de seguir, e apagar o app.e2e-spec.ts no fim.

Não crie nenhum teste ainda, só a rule e a skill.
```

**Prompt 2: rule e skill de teste unitário**
```
Agora o padrão de teste unitário:

1. .claude/rules/unit-tests.md (paths: src/**/*.ts), com base nos specs que já existem:
   - arquivo ao lado do código
   - três moldes com arquivo de referência: service com dependências
     (users.service.spec.ts + test/utils/repository.mock.ts), classe pura
     (pricing-calculation.service.spec.ts) e DTO (create-user.dto.spec.ts)
   - toda exceção do service testada (tipo da exceção e nada gravado)
   - regra numérica com it.each em tabela e bordas obrigatórias
   - mockar só a fronteira, nunca o próprio service
2. .claude/skills/criar-teste-unitario/SKILL.md com argumento <modulo> [arquivo]:
   listar os ramos do código → propor a tabela de casos antes de escrever →
   escrever no molde certo → rodar test e test:cov do arquivo.

Acrescente no AGENTS.md uma linha apontando para .claude/rules/ (sem duplicar o conteúdo).
```
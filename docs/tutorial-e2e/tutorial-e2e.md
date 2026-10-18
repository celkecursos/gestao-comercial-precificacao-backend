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

**Prompt 3:**
```
Crie .github/workflows/ci.yml para este backend, no mesmo estilo do workflow do frontend
(../gestao-comercial-precificacao-frontend/.github/workflows/e2e.yml):
- dispara em pull_request e push para develop, homolog e main
- Node 24, cache de npm, concurrency por ref
- job "quality": npm ci, lint, format:check, build, test com cobertura
- job "e2e": MySQL 8.4 como service, npm run test:e2e
- job "migrations": MySQL, migration:run e depois migration:generate com --check
  (falha se houver mudança de entidade sem migration)
- segredos só de CI, com comentário dizendo que o banco nasce e morre com o job
Ajuste o AGENTS.md: trocar --dryrun por --check.
```

**Prompt 4** (repare que ele **não pede teste**):
```
Implemente a recuperação de senha por e-mail descrita em docs/ROADMAP.md:

- POST /auth/forgot-password (público): recebe o e-mail e responde sempre 204, exista
  ou não o usuário, para não revelar quais e-mails estão cadastrados
- POST /auth/reset-password (público): recebe o token e a nova senha
  (@IsStrongPassword) e grava via UsersService.updatePassword(), invalidando os tokens
- token de redefinição: entidade + migration, gravado com hash, expira em 1 hora,
  uso único; um pedido novo invalida os anteriores
- limite de tentativas no forgot-password por IP e por e-mail, considerando o IP real
  atrás do proxy da hospedagem
- envio atrás de uma interface MailService, com nodemailer:
  driver "log" (desenvolvimento, testes e CI) e driver "smtp" (homolog e produção)
- o provedor SMTP e o remetente mudam só por variável de ambiente, sem código
  específico de provedor e sem e-mail fixo no código
- variáveis novas no env.validation.ts e no .env.example: MAIL_DRIVER, SMTP_HOST,
  SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, MAIL_FROM (endereço do remetente),
  MAIL_FROM_NAME (nome exibido) e PASSWORD_RESET_URL (não use FRONTEND_URL, que é a
  lista de origens do CORS); com MAIL_DRIVER=smtp, as variáveis SMTP_* e MAIL_FROM
  são obrigatórias
- e-mail em HTML simples, com versão em texto, em português
- Swagger completo e ROADMAP/README atualizados, incluindo como configurar o SMTP
```

**Prompt 5:**
```
Implemente as telas de recuperação de senha consumindo a API do backend
(POST /auth/forgot-password e POST /auth/reset-password):
- link "Esqueci minha senha" na tela de login
- /esqueci-senha: formulário de e-mail; após enviar, sempre a mesma mensagem de sucesso
- /redefinir-senha?token=...: nova senha + confirmação, mesma validação de senha forte
  do cadastro; token inválido ou expirado mostra erro e link para pedir outro
- rotas públicas, seguindo o padrão visual da LoginPage
```
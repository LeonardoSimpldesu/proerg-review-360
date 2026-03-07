# Performance Reviews — Regras do Projeto

> Leia o arquivo `CONTEXT.md` na raiz do projeto antes de qualquer tarefa. Ele contém o domínio do produto, modelo de dados completo, fluxos e APIs.

## Stack
- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: React + Vite + TypeScript (`apps/web`)
- **Backend**: Fastify + TypeScript (`apps/api`)
- **ORM**: Prisma com SQLite
- **Shared types**: `packages/types`
- **Shared Zod schemas**: `packages/zod-schemas`
- **Notificações**: node-cron + Nodemailer
- **Infra**: Docker + GitHub Actions + Nginx (VPS)

## Estrutura esperada de pastas
```
apps/
  web/src/
    components/
    hooks/         # TanStack Query hooks
    pages/
    stores/        # Zustand
  api/src/
    routes/
    services/
    plugins/       # Fastify plugins (auth, rbac)
    jobs/          # node-cron jobs
  api/prisma/
    schema.prisma
    seed.ts
packages/
  types/src/       # Tipos compartilhados
  zod-schemas/src/ # Schemas Zod compartilhados entre front e back
```

## Convenções de código

### TypeScript
- Sempre tipar explicitamente retornos de funções assíncronas
- Usar tipos de `packages/types` ao invés de redefinir localmente
- Preferir `type` a `interface` para objetos simples; `interface` para contratos extensíveis

### Fastify (API)
- Toda rota deve ter schema Zod validado via `fastify-type-provider-zod`
- Autenticação via JWT — sempre verificar o token no plugin de auth antes de registrar rotas protegidas
- RBAC: verificar papel (admin, manager, employee) no nível de rota, não de serviço
- Nunca expor stack traces em respostas de erro em produção

### React (Web)
- Data fetching exclusivamente via TanStack Query — sem `useEffect` para fetch
- Estado global apenas no Zustand — não usar Context API para estado compartilhado
- Formulários via React Hook Form + Zod schema de `packages/zod-schemas`
- Não usar `any` — usar `unknown` e fazer narrowing

### Prisma
- Nunca usar `findMany` sem `take` (paginação obrigatória em listas)
- Usar transações para operações que envolvam múltiplas tabelas
- Migrations sempre com nome descritivo em snake_case

## Segurança e LGPD
- Dados de avaliação são sensíveis — nunca logar conteúdo de respostas
- Anonimato de pares deve ser preservado: nunca retornar `reviewer_id` quando `is_anonymous = true`
- Audit log obrigatório para: criação/fechamento de ciclo, submissão de avaliação, acesso a relatório
- JWT: access token expira em 15min, refresh token em 7 dias

## Consulta de documentação
Para consultar documentação de Fastify, Prisma, React, Zod, TanStack Query, Turborepo, node-cron ou Nodemailer, use WebFetch com a URL oficial ou WebSearch.

## Busca de exemplos no GitHub
Para buscar exemplos reais de implementação antes de criar do zero, use o comando `gh` via Bash ou WebSearch com `site:github.com`.

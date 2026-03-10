# CONTEXT.md — Performance Reviews

Leia este arquivo integralmente antes de qualquer tarefa de desenvolvimento.

---

## O que é este projeto

Sistema web de avaliação de desempenho inspirado no Factorial HR. Substitui o processo atual feito por planilhas e e-mails, centralizando ciclos de avaliação, coleta de respostas, consolidação de resultados e plano de desenvolvimento individual (PDP).

---

## Stack (decisões já fechadas — não sugerir alternativas)

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Forms | React Hook Form + Zod |
| State | Zustand |
| Data fetching | TanStack Query + Axios |
| Backend | Fastify + TypeScript |
| ORM | Prisma |
| Banco | SQLite |
| Notificações | node-cron + Nodemailer |
| Monorepo | Turborepo + pnpm |
| Infra | Docker + GitHub Actions + Nginx (VPS Hostinger) |
| Logs/Erros | Pino + Sentry |

---

## Estrutura do monorepo

```
/
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── docker-compose.yml
├── .github/workflows/
├── apps/
│   ├── web/                        # React + Vite
│   │   └── src/
│   │       ├── components/
│   │       ├── pages/
│   │       ├── hooks/              # TanStack Query hooks
│   │       ├── stores/             # Zustand
│   │       ├── lib/                # axios instance, utils
│   │       └── main.tsx
│   └── api/                        # Fastify
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── plugins/            # auth JWT, rbac, sensible
│       │   └── jobs/               # node-cron
│       └── prisma/
│           ├── schema.prisma
│           └── seed.ts
└── packages/
    ├── types/src/                   # Tipos TypeScript compartilhados
    └── zod-schemas/src/             # Schemas Zod compartilhados
```

---

## Personas e RBAC

| Papel | Permissões |
|---|---|
| `admin` | Cria templates, ciclos, define avaliadores, acompanha progresso, exporta relatórios |
| `manager` | Avalia liderados, vê consolidação do time, conduz feedback, define PDP |
| `employee` | Autoavaliação, avalia pares quando designado, visualiza próprios resultados (se liberado pelo admin) |

Regras críticas de acesso:
- Avaliações de pares podem ser anônimas (`is_anonymous = true`) — o `reviewer_id` **jamais** deve ser exposto na resposta da API nesses casos
- Colaborador só vê resultados após o ciclo ser fechado e publicado (`status = published`)
- Gestor só acessa avaliações do próprio time

---

## Fluxo principal do produto

```
1. Admin cria Template de Avaliação
   └── define competências, escala 1–5, perguntas (rating / text)

2. Admin cria Ciclo
   └── vincula template, define participantes, tipos de avaliação, prazos

3. Sistema gera review_assignments
   └── (avaliador, avaliado, ciclo, papel, prazo)
   └── envia notificações por e-mail

4. Avaliadores preenchem e submetem
   └── rascunho salvo antes da submissão final

5. Admin/Gestor acompanha status
   └── pendente / em andamento / concluído / atrasado

6. Admin fecha o ciclo → consolidação automática
   └── médias por competência + comentários
   └── comparativo autoavaliação x gestor

7. Gestor conduz reunião de feedback
   └── registra PDP (metas + ações)

8. Admin publica resultados → colaborador pode visualizar
```

---

## Estados dos ciclos

```
draft → active → closed → published
```

- Template **não pode ser editado** após o ciclo ir para `active`
- Apenas admin pode mover entre estados

---

## Modelo de dados

```prisma
model User {
  id         String     @id @default(cuid())
  name       String
  email      String     @unique
  password   String     // bcrypt
  role       Role       // admin | manager | employee
  employee   Employee?
  createdAt  DateTime   @default(now())
}

model Employee {
  id         String     @id @default(cuid())
  userId     String     @unique
  user       User       @relation(fields: [userId], references: [id])
  jobTitle   String
  teamId     String?
  team       Team?      @relation(fields: [teamId], references: [id])
  managerId  String?
  manager    Employee?  @relation("Reports", fields: [managerId], references: [id])
  reports    Employee[] @relation("Reports")
}

model Team {
  id        String     @id @default(cuid())
  name      String
  employees Employee[]
}

model ReviewTemplate {
  id        String            @id @default(cuid())
  name      String
  version   Int               @default(1)
  isActive  Boolean           @default(true)
  sections  TemplateSection[]
  cycles    ReviewCycle[]
  createdAt DateTime          @default(now())
}

model TemplateSection {
  id         String             @id @default(cuid())
  templateId String
  template   ReviewTemplate     @relation(fields: [templateId], references: [id])
  title      String
  order      Int
  questions  TemplateQuestion[]
}

model TemplateQuestion {
  id        String          @id @default(cuid())
  sectionId String
  section   TemplateSection @relation(fields: [sectionId], references: [id])
  type      QuestionType    // rating | text | choice
  text      String
  scaleMin  Int?
  scaleMax  Int?
  required  Boolean         @default(true)
  order     Int
}

model ReviewCycle {
  id          String             @id @default(cuid())
  name        String
  templateId  String
  template    ReviewTemplate     @relation(fields: [templateId], references: [id])
  startAt     DateTime
  endAt       DateTime
  status      CycleStatus        @default(draft)
  configJson  Json?
  assignments ReviewAssignment[]
  createdAt   DateTime           @default(now())
}

model ReviewAssignment {
  id                 String         @id @default(cuid())
  cycleId            String
  cycle              ReviewCycle    @relation(fields: [cycleId], references: [id])
  reviewerEmployeeId String
  revieweeEmployeeId String
  role               AssignmentRole // self | manager | peer
  isAnonymous        Boolean        @default(false)
  status             AssignmentStatus @default(pending)
  dueAt              DateTime
  response           ReviewResponse?
}

model ReviewResponse {
  id               String           @id @default(cuid())
  assignmentId     String           @unique
  assignment       ReviewAssignment @relation(fields: [assignmentId], references: [id])
  submittedAt      DateTime?
  overallComment   String?
  answers          ResponseAnswer[]
  isDraft          Boolean          @default(true)
}

model ResponseAnswer {
  id          String         @id @default(cuid())
  responseId  String
  response    ReviewResponse @relation(fields: [responseId], references: [id])
  questionId  String
  ratingValue Int?
  textValue   String?
}

model DevelopmentPlan {
  id             String            @id @default(cuid())
  cycleId        String
  employeeId     String
  ownerManagerId String
  goals          DevelopmentGoal[]
  createdAt      DateTime          @default(now())
}

model DevelopmentGoal {
  id      String     @id @default(cuid())
  planId  String
  plan    DevelopmentPlan @relation(fields: [planId], references: [id])
  text    String
  dueAt   DateTime?
  status  GoalStatus @default(pending)
}

model AuditLog {
  id           String   @id @default(cuid())
  actorId      String
  action       String
  entity       String
  entityId     String
  createdAt    DateTime @default(now())
  metadataJson Json?
}

enum Role { admin manager employee }
enum CycleStatus { draft active closed published }
enum QuestionType { rating text choice }
enum AssignmentRole { self manager peer }
enum AssignmentStatus { pending in_progress completed overdue }
enum GoalStatus { pending in_progress done }
```

---

## APIs REST (MVP)

```
POST   /auth/login
POST   /auth/refresh

POST   /templates
GET    /templates
GET    /templates/:id
PATCH  /templates/:id

POST   /cycles
GET    /cycles
GET    /cycles/:id
POST   /cycles/:id/activate
POST   /cycles/:id/close
POST   /cycles/:id/publish
GET    /cycles/:id/assignments?status=pending

POST   /assignments/:id/responses     # salvar rascunho
POST   /assignments/:id/submit        # submissão final

GET    /reports/employee/:id?cycle_id=...
GET    /reports/team/:id?cycle_id=...

POST   /pdp
PATCH  /pdp/:id
GET    /pdp/:employeeId
```

---

## Notificações (node-cron)

Jobs que rodam diariamente:
- D-7, D-3, D-1 antes de `dueAt` de cada `ReviewAssignment` com status `pending` ou `in_progress`
- Ao fechar ciclo: notificar gestores para iniciar feedback e PDP

---

## Telas do MVP (React)

1. Login
2. Dashboard RH — lista de ciclos + status geral
3. Editor de template
4. Criação de ciclo (wizard)
5. Lista de tarefas do avaliador (assignments pendentes)
6. Formulário de avaliação
7. Relatório do colaborador (gráficos por competência)
8. PDP do colaborador

---

## Requisitos não funcionais

- **LGPD**: dados de feedback são sensíveis; logs de auditoria obrigatórios para ações críticas
- **JWT**: access token 15min, refresh token 7 dias, rotação no refresh
- **Paginação**: toda listagem com `take` + `skip` — sem `findMany` sem limite
- **Erros**: nunca expor stack trace em produção; usar `@fastify/sensible`
- **Anonimato**: `reviewer_id` nunca retornado quando `is_anonymous = true`

---

## O que está FORA do MVP

- Calibração avançada e ranking forçado
- Machine learning
- Integrações com folha de pagamento
- Moderação de comentários
- Escala diferente de 1–5
- Multi-tenancy

---

## Status atual do projeto

Nenhum código foi escrito ainda. O próximo passo é criar a estrutura base do monorepo.
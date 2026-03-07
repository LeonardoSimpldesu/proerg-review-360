# Performance Reviews

Sistema web de avaliação de desempenho inspirado no Factorial HR. Substitui o processo atual feito por planilhas e e-mails, centralizando ciclos de avaliação, coleta de respostas, consolidação de resultados e plano de desenvolvimento individual (PDP).

## 🏗️ Arquitetura

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: React + Vite + TypeScript + shadcn/ui + Tailwind CSS
- **Backend**: Fastify + TypeScript + Prisma + SQLite
- **State Management**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod
- **Notificações**: node-cron + Nodemailer
- **Infra**: Docker + GitHub Actions + Nginx

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- pnpm 8+
- Docker (opcional)

### Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd performance-reviews

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente
cp apps/api/.env.example apps/api/.env

# Configure o banco de dados
pnpm --filter=@performance-reviews/api db:generate
pnpm --filter=@performance-reviews/api db:push
pnpm --filter=@performance-reviews/api db:seed

# Inicie em modo desenvolvimento
pnpm dev
```

### Com Docker

```bash
# Inicie os serviços
docker-compose up --build

# Em outro terminal, configure o banco
docker-compose exec api pnpm db:push
docker-compose exec api pnpm db:seed
```

## 📱 Acesso

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Prisma Studio**: `pnpm --filter=@performance-reviews/api db:studio`

### Usuários de Demonstração

| Papel | Email | Senha |
|---|---|---|
| Admin | admin@example.com | 123456 |
| Manager | joao.silva@example.com | 123456 |
| Employee | maria.santos@example.com | 123456 |
| Employee | pedro.oliveira@example.com | 123456 |

## 📁 Estrutura do Projeto

```
├── apps/
│   ├── web/                 # React + Vite
│   └── api/                 # Fastify + Prisma
├── packages/
│   ├── types/               # Tipos TypeScript compartilhados
│   └── zod-schemas/         # Schemas Zod compartilhados
├── .github/workflows/       # CI/CD
└── docker-compose.yml       # Docker para desenvolvimento
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev                     # Inicia todos os serviços
pnpm build                   # Build de produção
pnpm lint                    # Linting
pnpm test                    # Testes

# Banco de dados
pnpm db:generate             # Gera Prisma client
pnpm db:push                 # Aplica schema no banco
pnpm db:migrate             # Cria migration
pnpm db:seed                # Popula dados iniciais
```

## 🎯 Funcionalidades

### MVP
- [x] Estrutura base do monorepo
- [ ] Autenticação JWT + RBAC
- [ ] CRUD de templates de avaliação
- [ ] CRUD de ciclos de avaliação
- [ ] Sistema de assignments e respostas
- [ ] Dashboard administrativo
- [ ] Formulários de avaliação
- [ ] Relatórios e consolidação
- [ ] PDP (Plano de Desenvolvimento)
- [ ] Notificações por email

### Personas

| Papel | Permissões |
|---|---|
| Admin | Cria templates, ciclos, define avaliadores, acompanha progresso, exporta relatórios |
| Manager | Avalia liderados, vê consolidação do time, conduz feedback, define PDP |
| Employee | Autoavaliação, avalia pares quando designado, visualiza próprios resultados |

## 🔒 Segurança & LGPD

- Dados de avaliação são sensíveis
- Avaliações de pares podem ser anônimas
- Logs de auditoria para ações críticas  
- JWT com rotação automática (15min access, 7 dias refresh)
- RBAC no nível de rota

## 📊 APIs

### Principais Endpoints

```
POST   /auth/login
POST   /auth/refresh

POST   /templates
GET    /templates
PATCH  /templates/:id

POST   /cycles
GET    /cycles
POST   /cycles/:id/activate
POST   /cycles/:id/close

POST   /assignments/:id/responses
POST   /assignments/:id/submit

GET    /reports/employee/:id
GET    /reports/team/:id

POST   /pdp
PATCH  /pdp/:id
```

## 🤝 Contribuição

1. Crie uma branch para sua feature
2. Faça suas alterações
3. Execute os testes e linting
4. Abra um Pull Request

## 📄 Licença

Este projeto é privado e proprietário.
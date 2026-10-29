# Estado Atual do Projeto — Central de Serviços MTP

> Atualizado em: **29/10/2026 — 15h55 (BRT)**
> Regra: atualizar a cada 5 alterações e ao encerrar cada sessão.

---

## Identificação

| Campo | Valor |
|---|---|
| **Projeto** | Central de Serviços MTP |
| **Repositório** | https://github.com/emillysalmeida/sistema-chamados |
| **Branch principal** | `main` |
| **URL pública (Pages)** | https://emillysalmeida.github.io/sistema-chamados/ |
| **URL pública (Vercel)** | https://sistema-chamados-bay.vercel.app/ |
| **Spec de referência** | `.docs/spec.md` |

---

## Stack

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 19 + TypeScript |
| **Build** | Vite 6 |
| **Estilização** | CSS Vanilla (Design System MTP) |
| **Ícones** | Lucide React |
| **Backend / DB** | Supabase (PostgreSQL 17, RLS, Auth) |
| **Gerenciador** | npm |
| **Deploy** | GitHub Pages via GitHub Actions + Vercel |

---

## Estrutura de Arquivos

```
Sistema Abertura de Chamados/
├── .agents/               # Skills e regras do agente (não fazem parte do app)
│   └── rules/
│       └── continuidade-projeto.md   ← REGRA ATIVA
├── .docs/                 # Documentos internos (não versionados exceto spec e logo)
│   ├── Logo-MTP-BRANCO.png
│   ├── spec.md            ← FONTE DA VERDADE FUNCIONAL
│   ├── meu_git.txt        ← IGNORADO pelo git (dados pessoais)
│   └── Prompt_Github.txt  ← IGNORADO pelo git
├── .github/
│   └── workflows/
│       └── deploy.yml     ← Deploy automático GitHub Pages (com VITE_BASE_PATH)
├── docs/
│   ├── HISTORICO.md       ← Histórico de alterações
│   └── ESTADO_ATUAL.md    ← Este arquivo
├── public/
│   └── Logo-MTP-BRANCO.png
├── src/
│   ├── App.tsx            ← Roteamento principal + state global
│   ├── main.tsx           ← Entry point React
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AuditViewer.tsx       ← Painel de auditoria imutável
│   │   │   ├── CategoryManager.tsx   ← Gestão de categorias de serviço
│   │   │   ├── DepartmentManager.tsx ← Gestão de departamentos
│   │   │   ├── FormsManagerView.tsx  ← Construtor de formulários
│   │   │   ├── GlobalDashboard.tsx   ← KPIs consolidados
│   │   │   ├── TeamManager.tsx       ← Gestão de equipes de atendimento (NOVO)
│   │   │   └── UserManager.tsx       ← Gestão de usuários e papéis (3 roles)
│   │   ├── auth/
│   │   │   └── AuthScreen.tsx        ← Login/Signup/Reset via Supabase Auth
│   │   ├── catalog/
│   │   │   └── ServiceCatalogView.tsx ← Catálogo de serviços publicados
│   │   ├── forms/
│   │   │   ├── FormBuilder.tsx       ← Construtor drag-and-drop de formulários
│   │   │   └── FormRenderer.tsx      ← Renderizador de formulários para solicitante
│   │   ├── layout/
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Navbar.tsx            ← Barra superior com sino de notificações
│   │   │   └── Sidebar.tsx           ← Menu lateral dinâmico por papel
│   │   ├── notifications/
│   │   │   └── NotificationDrawer.tsx ← Painel lateral de notificações
│   │   └── tickets/
│   │       ├── TicketCreateModal.tsx  ← Modal de abertura de chamado
│   │       ├── TicketDetail.tsx       ← Detalhes + assumir/transferir + histórico (atualizado)
│   │       ├── TicketKanban.tsx       ← Visão Kanban por status
│   │       └── TicketList.tsx         ← Visão em lista com filtros
│   ├── lib/
│   │   └── supabase.ts               ← Cliente Supabase (URL/Key via env)
│   ├── services/
│   │   ├── auditService.ts           ← Trilha de auditoria imutável
│   │   ├── authService.ts            ← Auth Supabase + sync de perfil + teamService
│   │   ├── catalogService.ts         ← Departamentos, categorias, serviços
│   │   ├── formService.ts            ← Formulários com versionamento
│   │   ├── notificationService.ts    ← Notificações in-app + rastreio email
│   │   └── ticketService.ts          ← CRUD completo + claimTicket + assignTicket
│   ├── styles/
│   │   └── index.css                 ← Design System MTP (variáveis CSS, tokens)
│   └── types/
│       └── database.ts               ← Tipos TypeScript completos do domínio
├── .env                   ← IGNORADO pelo git (contém chaves reais Supabase)
├── .env.example           ← Versionado (apenas nomes de variáveis)
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.json
└── vite.config.ts         ← base: process.env.VITE_BASE_PATH || '/' (dinâmico)
```

---

## Módulos Implementados

| # | Módulo | Spec | Status |
|---|---|---|---|
| 1 | Estado inicial limpo (0 dados) | 3.1 | ✅ Implementado |
| 2 | Bootstrap de Super Admin inicial | 3.2 / 3.3 | ✅ Implementado |
| 3 | Autenticação via Supabase Auth | — | ✅ Implementado |
| 4 | Portal do Solicitante — Catálogo | 6 | ✅ Implementado |
| 5 | Portal do Solicitante — Minhas Solicitações | 6 | ✅ Implementado |
| 6 | Abertura de chamado com protocolo único | 6 | ✅ Implementado |
| 7 | Construtor de Formulários (13 tipos de campo) | 7 | ✅ Implementado |
| 8 | Versionamento de formulários | 7 | ✅ Implementado |
| 9 | Central de Atendimento — Fila compartilhada | 9.1 | ✅ Implementado |
| 10 | Central de Atendimento — Kanban | 9 | ✅ Implementado |
| 11 | Assumir chamado voluntariamente (sem responsável) | 9.2 | ✅ Implementado |
| 12 | Assumir chamado de outro atendente | 9.2 | ✅ Implementado (Etapa 2) |
| 13 | Designação pelo Super Admin para qualquer atendente | 9.3 | ✅ Implementado (Etapa 2) |
| 14 | Histórico de transferências no `ticket_events` | Ref. 01 | ✅ Implementado (Etapa 2) |
| 15 | Notificação de responsável anterior e novo | 10 | ✅ Implementado (Etapa 2) |
| 16 | Respostas Públicas vs. Notas Internas | 8.6 | ✅ Implementado |
| 17 | Notificações in-app (sino) | 10 | ✅ Implementado |
| 18 | Rastreio de e-mail (status honesto) | 10 | ✅ Implementado |
| 19 | Painel de KPIs (GlobalDashboard) | 12 | ✅ Implementado |
| 20 | Trilha de Auditoria imutável | 12 | ✅ Implementado |
| 21 | Gestão de Departamentos | — | ✅ Implementado |
| 22 | Gestão de Categorias | — | ✅ Implementado |
| 23 | Gestão de Usuários e Papéis (3 roles) | Ref. 01 | ✅ Implementado |
| 24 | Papel `atendente` (3 papéis globais) | Ref. 01 | ✅ Implementado |
| 25 | Gestão de Equipes (`TeamManager`) | Ref. 01 | ✅ Implementado |
| 26 | Base path dinâmico (GitHub Pages + Vercel) | Deploy | ✅ Implementado |
| 27 | Tabelas `teams` e `team_members` criadas no Supabase | Ref. 01 | ✅ Concluído |
| 28 | Constraint `users_profile_role_check` corrigida no Supabase | Ref. 01 | ✅ Concluído |
| 29 | Coluna `team_email` renomeada corretamente na tabela `teams` | Ref. 01 | ✅ Concluído |
| 30 | `CatalogAdmin` — administração integrada do catálogo | Ref. 03 | ✅ Implementado |
| 31 | Sidebar: entrada única "Catálogo de Serviços" (`admin_catalog`) | Ref. 03 | ✅ Implementado |
| 32 | `FormBuilder` reformulado estilo Microsoft Forms | Ref. 04 | ✅ Implementado |
| 33 | Configuração de anexos (opcional por padrão, tipos de arquivo) | Ref. 04 | ✅ Implementado |
| 34 | Remoção da exigência de termos de responsabilidade nos novos forms | Ref. 04 | ✅ Implementado |
| 35 | Pré-visualização funcional 100% integrada com `FormRenderer` | Ref. 04 | ✅ Implementado |
| 36 | Fluxo de Aprovação Obrigatória para chamados da TI (`aguardando_aprovacao`) | Ref. 05 | ✅ Implementado |
| 37 | Ação de Aprovação pela equipe de TI (`approveTicket`) | Ref. 05 | ✅ Implementado |
| 38 | Edição do formulário pelo solicitante antes da aprovação (`updateTicketAnswers`) | Ref. 05 | ✅ Implementado |
| 39 | Bloqueio do formulário após aprovação e histórico/auditoria | Ref. 05 | ✅ Implementado |

---

## Tipos do Domínio (`database.ts`)

| Tipo | Descrição |
|---|---|
| `UserProfile` | Perfil de usuário (`solicitante` \| `atendente` \| `super_admin`) |
| `Department` | Departamento com código, ícone, status, publicação |
| `DepartmentMember` | Vínculo usuário ↔ departamento + flag `can_respond` |
| `ServiceCategory` | Categoria de serviço dentro de um departamento |
| `ServiceType` | Serviço vinculado a categoria + formulário |
| `FormDefinition` | Definição do formulário com versionamento |
| `FormVersion` | Versão específica com schema de campos |
| `FormField` | Campo individual (13 tipos suportados) |
| `Ticket` | Chamado com protocolo, prioridade, status, responsável |
| `TicketAnswer` | Respostas do solicitante ao formulário |
| `TicketMessage` | Mensagens públicas e notas internas |
| `TicketAttachment` | Anexos de mensagens |
| `TicketEvent` | Eventos imutáveis do histórico do chamado |
| `Notification` | Notificação in-app por usuário |
| `NotificationDelivery` | Rastreio de entrega (in_app / email) |
| `AuditLog` | Trilha de auditoria imutável |
| `UserPreference` | Preferências de notificação por usuário |
| `Team` | Equipe de atendimento vinculada a um departamento |
| `TeamMember` | Vínculo usuário ↔ equipe |

---

## Configuração Git / Deploy

| Item | Valor |
|---|---|
| **Usuário** | `emillysalmeida` |
| **E-mail** | `emilly.almeida250576@gmail.com` (config local) |
| **Remote origin** | `https://github.com/emillysalmeida/sistema-chamados.git` |
| **Branch** | `main` |
| **GitHub Pages** | GitHub Actions workflow → `dist/` |
| **Vercel** | Deploy automático via GitHub integração |
| **`VITE_BASE_PATH`** | `/sistema-chamados/` para GH Pages; `/` (ou ausente) para Vercel |

---

## Pendências em Aberto

| # | Pendência | Prioridade |
|---|---|---|
| 1 | **[GitHub]** Adicionar Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | 🔴 Alta |
| 2 | **[GitHub]** Configurar Pages source = "GitHub Actions" | 🔴 Alta |
| 3 | **[Vercel]** Definir env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | 🔴 Alta |
| 4 | Executar commit e push das alterações acumuladas (Etapa 2 + Refinamentos 03, 04 e 05) | 🔴 Alta |
| 5 | `src/lib/supabase.ts` possui fallback hardcoded da chave anon — avaliar remoção futura | 🟡 Baixa |

---

## Observações de Segurança

- `.env` com chaves reais **nunca foi versionado** (ignorado pelo `.gitignore`).
- O arquivo `src/lib/supabase.ts` contém um fallback hardcoded da `VITE_SUPABASE_ANON_KEY`. Esta é uma chave `anon` pública do Supabase (projetada para ser exposta no frontend), portanto não representa risco crítico.
- `meu_git.txt` e `Prompt_Github.txt` estão ignorados pelo `.gitignore` e nunca serão versionados.


---

## Identificação

| Campo | Valor |
|---|---|
| **Projeto** | Central de Serviços MTP |
| **Repositório** | https://github.com/emillysalmeida/sistema-chamados |
| **Branch principal** | `main` |
| **URL pública (Pages)** | https://emillysalmeida.github.io/sistema-chamados/ |
| **Spec de referência** | `.docs/spec.md` |

---

## Stack

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 19 + TypeScript |
| **Build** | Vite 6 |
| **Estilização** | CSS Vanilla (Design System MTP) |
| **Ícones** | Lucide React |
| **Backend / DB** | Supabase (PostgreSQL 17, RLS, Auth) |
| **Gerenciador** | npm |
| **Deploy** | GitHub Pages via GitHub Actions |

---

## Estrutura de Arquivos

```
Sistema Abertura de Chamados/
├── .agents/               # Skills e regras do agente (não fazem parte do app)
│   └── rules/
│       └── continuidade-projeto.md   ← REGRA ATIVA
├── .docs/                 # Documentos internos (não versionados exceto spec e logo)
│   ├── Logo-MTP-BRANCO.png
│   ├── spec.md            ← FONTE DA VERDADE FUNCIONAL
│   ├── meu_git.txt        ← IGNORADO pelo git (dados pessoais)
│   └── Prompt_Github.txt  ← IGNORADO pelo git
├── .github/
│   └── workflows/
│       └── deploy.yml     ← Deploy automático GitHub Pages
├── docs/
│   ├── HISTORICO.md       ← Este projeto de continuidade
│   └── ESTADO_ATUAL.md    ← Este arquivo
├── public/
│   └── Logo-MTP-BRANCO.png
├── src/
│   ├── App.tsx            ← Roteamento principal + state global
│   ├── main.tsx           ← Entry point React
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AuditViewer.tsx       ← Painel de auditoria imutável
│   │   │   ├── CategoryManager.tsx   ← Gestão de categorias de serviço
│   │   │   ├── DepartmentManager.tsx ← Gestão de departamentos
│   │   │   ├── FormsManagerView.tsx  ← Construtor de formulários
│   │   │   ├── GlobalDashboard.tsx   ← KPIs consolidados
│   │   │   └── UserManager.tsx       ← Gestão de usuários e papéis
│   │   ├── auth/
│   │   │   └── AuthScreen.tsx        ← Login/Signup/Reset via Supabase Auth
│   │   ├── catalog/
│   │   │   └── ServiceCatalogView.tsx ← Catálogo de serviços publicados
│   │   ├── forms/
│   │   │   ├── FormBuilder.tsx       ← Construtor drag-and-drop de formulários
│   │   │   └── FormRenderer.tsx      ← Renderizador de formulários para solicitante
│   │   ├── layout/
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Navbar.tsx            ← Barra superior com sino de notificações
│   │   │   └── Sidebar.tsx           ← Menu lateral dinâmico por papel
│   │   ├── notifications/
│   │   │   └── NotificationDrawer.tsx ← Painel lateral de notificações
│   │   └── tickets/
│   │       ├── TicketCreateModal.tsx  ← Modal de abertura de chamado
│   │       ├── TicketDetail.tsx       ← Detalhes + mensagens + eventos do chamado
│   │       ├── TicketKanban.tsx       ← Visão Kanban por status
│   │       └── TicketList.tsx         ← Visão em lista com filtros
│   ├── lib/
│   │   └── supabase.ts               ← Cliente Supabase (URL/Key via env)
│   ├── services/
│   │   ├── auditService.ts           ← Trilha de auditoria imutável
│   │   ├── authService.ts            ← Auth Supabase + sync de perfil
│   │   ├── catalogService.ts         ← Departamentos, categorias, serviços
│   │   ├── formService.ts            ← Formulários com versionamento
│   │   ├── notificationService.ts    ← Notificações in-app + rastreio email
│   │   └── ticketService.ts          ← CRUD completo de chamados
│   ├── styles/
│   │   └── index.css                 ← Design System MTP (variáveis CSS, tokens)
│   └── types/
│       └── database.ts               ← Tipos TypeScript completos do domínio
├── .env                   ← IGNORADO pelo git (contém chaves reais Supabase)
├── .env.example           ← Versionado (apenas nomes de variáveis)
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.json
└── vite.config.ts         ← base: '/sistema-chamados/' (GitHub Pages)
```

---

## Módulos Implementados

| # | Módulo | Spec | Status |
|---|---|---|---|
| 1 | Estado inicial limpo (0 dados) | 3.1 | ✅ Implementado |
| 2 | Bootstrap de Super Admin inicial | 3.2 / 3.3 | ✅ Implementado |
| 3 | Autenticação via Supabase Auth | — | ✅ Implementado |
| 4 | Portal do Solicitante — Catálogo | 6 | ✅ Implementado |
| 5 | Portal do Solicitante — Minhas Solicitações | 6 | ✅ Implementado |
| 6 | Abertura de chamado com protocolo único (ex: `TI-000001`) | 6 | ✅ Implementado |
| 7 | Construtor de Formulários (13 tipos de campo) | 7 | ✅ Implementado |
| 8 | Versionamento de formulários | 7 | ✅ Implementado |
| 9 | Central de Atendimento — Fila compartilhada | 9.1 | ✅ Implementado |
| 10 | Central de Atendimento — Kanban | 9 | ✅ Implementado |
| 11 | Assumir chamado voluntariamente | 9.2 | ✅ Implementado |
| 12 | Respostas Públicas vs. Notas Internas | 8.6 | ✅ Implementado |
| 13 | Notificações in-app (sino) | 10 | ✅ Implementado |
| 14 | Rastreio de e-mail (status honesto) | 10 | ✅ Implementado |
| 15 | Painel de KPIs (GlobalDashboard) | 12 | ✅ Implementado |
| 16 | Trilha de Auditoria imutável | 12 | ✅ Implementado |
| 17 | Gestão de Departamentos | — | ✅ Implementado |
| 18 | Gestão de Categorias | — | ✅ Implementado |
| 19 | Gestão de Usuários e Papéis | — | ✅ Implementado |
| 20 | Papel `atendente` (3 papéis globais) | Ref. 01 | ✅ Implementado |
| 21 | Gestão de Equipes (`TeamManager`) | Ref. 01 | ✅ Implementado |

---

## Tipos do Domínio (`database.ts`)

| Tipo | Descrição |
|---|---|
| `UserProfile` | Perfil de usuário (`solicitante` \| `atendente` \| `super_admin`) |
| `Department` | Departamento com código, ícone, status, publicação |
| `DepartmentMember` | Vínculo usuário ↔ departamento + flag `can_respond` |
| `ServiceCategory` | Categoria de serviço dentro de um departamento |
| `ServiceType` | Serviço vinculado a categoria + formulário |
| `FormDefinition` | Definição do formulário com versionamento |
| `FormVersion` | Versão específica com schema de campos |
| `FormField` | Campo individual (13 tipos suportados) |
| `Ticket` | Chamado com protocolo, prioridade, status, responsável |
| `TicketAnswer` | Respostas do solicitante ao formulário |
| `TicketMessage` | Mensagens públicas e notas internas |
| `TicketAttachment` | Anexos de mensagens |
| `TicketEvent` | Eventos imutáveis do histórico do chamado |
| `Notification` | Notificação in-app por usuário |
| `NotificationDelivery` | Rastreio de entrega (in_app / email) |
| `AuditLog` | Trilha de auditoria imutável |
| `UserPreference` | Preferências de notificação por usuário |
| `Team` | Equipe de atendimento vinculada a um departamento |
| `TeamMember` | Vínculo usuário ↔ equipe |

---

## Configuração Git

| Item | Valor |
|---|---|
| **Usuário** | `emillysalmeida` |
| **E-mail** | `emilly.almeida250576@gmail.com` (config local) |
| **Remote origin** | `https://github.com/emillysalmeida/sistema-chamados.git` |
| **Branch** | `main` |

---

## Pendências em Aberto

| # | Pendência | Prioridade |
|---|---|---|
| 1 | Confirmar que o `git push` do primeiro commit foi executado com sucesso | Alta |
| 2 | Adicionar Secrets no GitHub (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) | Alta |
| 3 | Configurar GitHub Pages para usar fonte "GitHub Actions" | Alta |
| 4 | Verificar se o deploy automático (workflow) está funcionando | Alta |
| 5 | **[Refinamento 01]** Criar tabelas `teams` e `team_members` no Supabase (SQL em `docs/HISTORICO.md`) | Alta |
| 6 | **[Refinamento 01]** Etapa 2 — Atribuição de chamados (não iniciada ainda) | Média |
| 7 | `src/lib/supabase.ts` possui fallback hardcoded da chave Supabase — avaliar remoção futura | Baixa |

---

## Observações de Segurança

- `.env` com chaves reais **nunca foi versionado** (ignorado pelo `.gitignore`).
- O arquivo `src/lib/supabase.ts` contém um fallback hardcoded da `VITE_SUPABASE_ANON_KEY`. Esta é uma chave `anon` pública do Supabase (projetada para ser exposta no frontend), portanto não representa risco crítico, mas idealmente deve depender apenas das variáveis de ambiente.
- `meu_git.txt` e `Prompt_Github.txt` estão ignorados pelo `.gitignore` e nunca serão versionados.


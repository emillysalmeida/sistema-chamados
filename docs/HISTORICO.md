# Histórico de Alterações — Central de Serviços MTP

> Arquivo mantido conforme regra `.agents/rules/continuidade-projeto.md`.
> Registrar após CADA alteração concluída.

---

## [Sessão 29/10/2026] — Refinamento 01 · Etapa 2: Atribuição, Transferência e Correção de Deploy

### Alteração 9 — `claimTicket` reescrito: transferência livre entre atendentes, sem mudança automática de status

**Descrição:**
- Atendentes agora podem assumir chamados já atribuídos a outros (antes só era possível quando `assigned_to` era nulo).
- Status **não** é alterado automaticamente ao assumir (spec: "a mudança de responsável NÃO deve alterar automaticamente o status").
- Registra responsável anterior em `old_value`/`new_value` no evento `ticket_events`.
- Notifica o responsável anterior e o novo responsável via `notificationService`.
- Concorrência atômica preservada (update sem `match` adicional, última gravação vence — aceitável para o volume atual).
- Corrigido bug anterior: estava passando `ticketId` em vez de `current.department_id` em `isAttendantForDepartment`.

**Arquivos modificados:**
- `src/services/ticketService.ts` — método `claimTicket` completamente reescrito.

**Testes / Validação:** Build ✅ (2021 módulos, zero erros TypeScript).

**Resultado:** ✅ Concluída.

---

### Alteração 10 — `TicketDetail.tsx`: UI aprimorada para assumir/transferir responsabilidade

**Descrição:**
- Botão "Assumir Chamado" agora visível quando o chamado está atribuído a outro atendente (não só quando sem responsável).
- Rótulo dinâmico: "Assumir de [PrimeiroNome]" quando há responsável atual, "Assumir Chamado" quando não há.
- Botão oculto para chamados com status `resolvido`, `fechado` ou `cancelado`.
- Sidebar "Responsável Principal" aprimorada: exibe e-mail, pílula "Você é o responsável", botão inline "Assumir este chamado".
- Imports `ArrowRightLeft` e `UserMinus` adicionados (usados em ícones de contexto).

**Arquivos modificados:**
- `src/components/tickets/TicketDetail.tsx` — seção de responsável e botões de ação.

**Testes / Validação:** Build ✅ (2021 módulos, zero erros TypeScript).

**Resultado:** ✅ Concluída.

---

### Alteração 11 — `vite.config.ts`: base path dinâmico para suportar GitHub Pages e Vercel

**Descrição:**
- `base` alterado de `'/sistema-chamados/'` (fixo) para `process.env.VITE_BASE_PATH || '/'`.
- GitHub Pages recebe `VITE_BASE_PATH=/sistema-chamados/` via env no workflow.
- Vercel serve na raiz `/` — não precisa definir a variável (padrão `/`).
- Resolve a tela branca em ambos os ambientes.

**Arquivos modificados:**
- `vite.config.ts`
- `.github/workflows/deploy.yml` — adicionado `VITE_BASE_PATH: /sistema-chamados/` no step de build.

**Testes / Validação:** Build local ✅ (2021 módulos). GitHub Pages e Vercel aguardam push para validação final.

**Resultado:** ✅ Implementada localmente — aguardando deploy.

---

**Pendências críticas (executar manualmente no Supabase SQL Editor):**

1. Atualizar constraint de papel:
```sql
ALTER TABLE users_profile DROP CONSTRAINT IF EXISTS users_profile_role_check;
ALTER TABLE users_profile ADD CONSTRAINT users_profile_role_check
  CHECK (role IN ('solicitante', 'atendente', 'super_admin'));
```

2. Criar tabelas `teams` e `team_members` (SQL completo em Alteração 7 neste histórico).

3. Vercel: definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do projeto.

4. GitHub Pages: adicionar secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no repositório (Settings → Secrets and variables → Actions).

---

## [Sessão 28/10/2026 — 17h00] — Refinamento 01 · Etapa 1: Usuários, Perfis e Equipes

### Alteração 3 — Novo papel `atendente` no domínio de tipos

**Descrição:** Adicionado `'atendente'` ao union type `UserRole` e criados os tipos `Team` e `TeamMember` em `database.ts`.

**Arquivos modificados:**
- `src/types/database.ts` — `UserRole` agora é `'solicitante' | 'atendente' | 'super_admin'`; adicionadas interfaces `Team` e `TeamMember`.

**Testes / Validação:** Build ✅ (parte do build final — zero erros TypeScript).

**Resultado:** ✅ Concluída.

---

### Alteração 4 — `authService` suporta 3 papéis + novo `teamService`

**Descrição:**
- `updateRole` atualizado para aceitar `'solicitante' | 'atendente' | 'super_admin'`, com lógica de proteção do último Super Admin corrigida (verifica se o alvo é super_admin antes de bloquear).
- Adicionado `teamService` com operações completas: `getTeams`, `createTeam`, `updateTeam`, `getTeamMembers`, `addTeamMember`, `removeTeamMember`, `getUserTeams`.
- `addTeamMember` vincula automaticamente o usuário ao `department_members` do departamento da equipe.
- `removeTeamMember` verifica outras equipes no mesmo departamento antes de remover o vínculo; devolve chamados atribuídos para a fila coletiva.

**Arquivos modificados:**
- `src/services/authService.ts`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

### Alteração 5 — `Sidebar` reconhece papel `atendente` + nova tab `admin_teams`

**Descrição:**
- `isAttendant` agora é `true` se `role === 'atendente'` OU `role === 'super_admin'` OU tem departamentos vinculados.
- Adicionado `'admin_teams'` ao union `ActiveTab`.
- Adicionado item "Gestão de Equipes" no menu Admin com ícone `UsersRound`.

**Arquivos modificados:**
- `src/components/layout/Sidebar.tsx`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

### Alteração 6 — Novo componente `TeamManager.tsx`

**Descrição:** Componente completo de gestão de equipes com:
- Listagem de equipes com expandir/recolher membros.
- Modal de criação e edição (nome, descrição, e-mail de referência, departamento).
- Adição e remoção de membros com confirmação.
- Aviso de chamados devolvidos à fila ao remover membro.
- Desativar/reativar equipe.

**Arquivos criados:**
- `src/components/admin/TeamManager.tsx`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

### Alteração 7 — `UserManager.tsx` reformulado (3 papéis + equipes vinculadas)

**Descrição:**
- Tabela de usuários agora exibe avatar colorido por papel.
- Modal de alteração de papel oferece os 3 papéis com descrição de cada um.
- Botão "Expandir" exibe equipes vinculadas por usuário.
- Legenda visual dos 3 papéis no topo da tela.
- Proteção do último Super Admin mantida.
- `emilly.almeida@mtp.com.br` preservada como Super Admin (não alterada automaticamente).

**Arquivos modificados:**
- `src/components/admin/UserManager.tsx`

**Arquivos modificados:**
- `src/App.tsx` — importação de `TeamManager` e `case 'admin_teams'` no switch de rotas.

**Testes / Validação:** Build ✅ — zero erros TypeScript (2021 módulos, `tsc -b && vite build`).

**Resultado:** ✅ Concluída.

**Pendências desta etapa:**
- As tabelas `teams` e `team_members` precisam ser criadas no Supabase antes de testar em produção.
  SQL necessário documentado abaixo.

---

### SQL necessário no Supabase (Etapa 1)

```sql
-- Tabela de equipes
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  team_email text,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de membros de equipes
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- RLS (ajustar conforme política existente)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Super Admin lê e escreve tudo
CREATE POLICY "super_admin_all_teams" ON teams FOR ALL USING (
  EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "super_admin_all_team_members" ON team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'super_admin')
);

-- Usuários autenticados leem equipes
CREATE POLICY "authenticated_read_teams" ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_read_team_members" ON team_members FOR SELECT USING (auth.uid() IS NOT NULL);
```

---

## [Sessão 28/10/2026] — Preparação do repositório Git e publicação no GitHub Pages

### Alteração 1 — Inicialização do repositório Git e configuração de publicação

**Descrição:**
Preparação completa do projeto para versionamento e publicação no GitHub. O projeto ainda não possuía repositório Git.

**Arquivos criados:**
- `.gitignore` — criado do zero, adequado para stack React 19 + TypeScript + Vite + Supabase. Ignora: `.env`, `node_modules/`, `dist/`, `tsconfig.tsbuildinfo`, arquivos de SO, editores, `.docs/meu_git.txt` e `.docs/Prompt_Github.txt`.
- `.github/workflows/deploy.yml` — workflow GitHub Actions para build e deploy automático no GitHub Pages a cada push no branch `main`.

**Arquivos modificados:**
- `vite.config.ts` — adicionada propriedade `base: '/sistema-chamados/'` para corrigir caminhos de assets no GitHub Pages (tela branca).

**Git configurado:**
- Usuário: `emillysalmeida`
- Remote: `https://github.com/emillysalmeida/sistema-chamados.git`
- Branch: `main`
- Stage: 114 arquivos preparados

**Testes / Validação:**
- `npm run build` — ✅ concluído com sucesso (2020 módulos transformados, sem erros de TypeScript).
- Verificação de segredos no stage — ✅ `.env` ignorado corretamente, `meu_git.txt` ignorado.

**Resultado:** ✅ Projeto pronto para o primeiro commit e push. Comandos entregues para execução manual.

**Pendências:**
- Usuária precisa adicionar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` como Secrets no GitHub (Settings → Secrets and variables → Actions).
- Usuária precisa configurar GitHub Pages para usar fonte "GitHub Actions" (Settings → Pages → Source).
- Confirmar que o push foi executado com sucesso.

---

## [Sessão 29/10/2026] — Refinamento 01 · Etapa 2: Atribuição, Transferência e Correção de Deploy

### Alteração 9 — `claimTicket` reescrito: transferência livre entre atendentes, sem mudança automática de status

**Descrição:**
- Atendentes agora podem assumir chamados já atribuídos a outros (antes só era possível quando `assigned_to` era nulo).
- Status **não** é alterado automaticamente ao assumir (spec: "a mudança de responsável NÃO deve alterar automaticamente o status").
- Registra responsável anterior em `old_value`/`new_value` no evento `ticket_events`.
- Notifica o responsável anterior e o novo responsável via `notificationService`.
- Concorrência atômica preservada (update sem `match` adicional, última gravação vence — aceitável para o volume atual).
- Corrigido bug anterior: estava passando `ticketId` em vez de `current.department_id` em `isAttendantForDepartment`.

**Arquivos modificados:**
- `src/services/ticketService.ts` — método `claimTicket` completamente reescrito.

**Testes / Validação:** Build ✅ (2021 módulos, zero erros TypeScript).

**Resultado:** ✅ Concluída.

---

### Alteração 10 — `TicketDetail.tsx`: UI aprimorada para assumir/transferir responsabilidade

**Descrição:**
- Botão "Assumir Chamado" agora visível quando o chamado está atribuído a outro atendente (não só quando sem responsável).
- Rótulo dinâmico: "Assumir de [PrimeiroNome]" quando há responsável atual, "Assumir Chamado" quando não há.
- Botão oculto para chamados com status `resolvido`, `fechado` ou `cancelado`.
- Sidebar "Responsável Principal" aprimorada: exibe e-mail, pílula "Você é o responsável", botão inline "Assumir este chamado".
- Imports `ArrowRightLeft` e `UserMinus` adicionados (usados em ícones de contexto).

**Arquivos modificados:**
- `src/components/tickets/TicketDetail.tsx` — seção de responsável e botões de ação.

**Testes / Validação:** Build ✅ (2021 módulos, zero erros TypeScript).

**Resultado:** ✅ Concluída.

---

### Alteração 11 — `vite.config.ts`: base path dinâmico para suportar GitHub Pages e Vercel

**Descrição:**
- `base` alterado de `'/sistema-chamados/'` (fixo) para `process.env.VITE_BASE_PATH || '/'`.
- GitHub Pages recebe `VITE_BASE_PATH=/sistema-chamados/` via env no workflow.
- Vercel serve na raiz `/` — não precisa definir a variável (padrão `/`).
- Resolve a tela branca em ambos os ambientes.

**Arquivos modificados:**
- `vite.config.ts`
- `.github/workflows/deploy.yml` — adicionado `VITE_BASE_PATH: /sistema-chamados/` no step de build.

**Testes / Validação:** Build local ✅ (2021 módulos). GitHub Pages e Vercel aguardam push para validação final.

**Resultado:** ✅ Implementada localmente — aguardando deploy.

---

**Pendências críticas (executar manualmente no Supabase SQL Editor):**

1. Atualizar constraint de papel:
```sql
ALTER TABLE users_profile DROP CONSTRAINT IF EXISTS users_profile_role_check;
ALTER TABLE users_profile ADD CONSTRAINT users_profile_role_check
  CHECK (role IN ('solicitante', 'atendente', 'super_admin'));
```

2. Criar tabelas `teams` e `team_members` (SQL completo em Alteração 7 neste histórico).

3. Vercel: definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do projeto.

4. GitHub Pages: adicionar secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no repositório (Settings → Secrets and variables → Actions).

---

## [Sessão 28/10/2026 — 17h00] — Refinamento 01 · Etapa 1: Usuários, Perfis e Equipes

### Alteração 3 — Novo papel `atendente` no domínio de tipos

**Descrição:** Adicionado `'atendente'` ao union type `UserRole` e criados os tipos `Team` e `TeamMember` em `database.ts`.

**Arquivos modificados:**
- `src/types/database.ts` — `UserRole` agora é `'solicitante' | 'atendente' | 'super_admin'`; adicionadas interfaces `Team` e `TeamMember`.

**Testes / Validação:** Build ✅ (parte do build final — zero erros TypeScript).

**Resultado:** ✅ Concluída.

---

### Alteração 4 — `authService` suporta 3 papéis + novo `teamService`

**Descrição:**
- `updateRole` atualizado para aceitar `'solicitante' | 'atendente' | 'super_admin'`, com lógica de proteção do último Super Admin corrigida (verifica se o alvo é super_admin antes de bloquear).
- Adicionado `teamService` com operações completas: `getTeams`, `createTeam`, `updateTeam`, `getTeamMembers`, `addTeamMember`, `removeTeamMember`, `getUserTeams`.
- `addTeamMember` vincula automaticamente o usuário ao `department_members` do departamento da equipe.
- `removeTeamMember` verifica outras equipes no mesmo departamento antes de remover o vínculo; devolve chamados atribuídos para a fila coletiva.

**Arquivos modificados:**
- `src/services/authService.ts`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

### Alteração 5 — `Sidebar` reconhece papel `atendente` + nova tab `admin_teams`

**Descrição:**
- `isAttendant` agora é `true` se `role === 'atendente'` OU `role === 'super_admin'` OU tem departamentos vinculados.
- Adicionado `'admin_teams'` ao union `ActiveTab`.
- Adicionado item "Gestão de Equipes" no menu Admin com ícone `UsersRound`.

**Arquivos modificados:**
- `src/components/layout/Sidebar.tsx`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

### Alteração 6 — Novo componente `TeamManager.tsx`

**Descrição:** Componente completo de gestão de equipes com:
- Listagem de equipes com expandir/recolher membros.
- Modal de criação e edição (nome, descrição, e-mail de referência, departamento).
- Adição e remoção de membros com confirmação.
- Aviso de chamados devolvidos à fila ao remover membro.
- Desativar/reativar equipe.

**Arquivos criados:**
- `src/components/admin/TeamManager.tsx`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

### Alteração 7 — `UserManager.tsx` reformulado (3 papéis + equipes vinculadas)

**Descrição:**
- Tabela de usuários agora exibe avatar colorido por papel.
- Modal de alteração de papel oferece os 3 papéis com descrição de cada um.
- Botão "Expandir" exibe equipes vinculadas por usuário.
- Legenda visual dos 3 papéis no topo da tela.
- Proteção do último Super Admin mantida.
- `emilly.almeida@mtp.com.br` preservada como Super Admin (não alterada automaticamente).

**Arquivos modificados:**
- `src/components/admin/UserManager.tsx`

**Arquivos modificados:**
- `src/App.tsx` — importação de `TeamManager` e `case 'admin_teams'` no switch de rotas.

**Testes / Validação:** Build ✅ — zero erros TypeScript (2021 módulos, `tsc -b && vite build`).

**Resultado:** ✅ Concluída.

**Pendências desta etapa:**
- As tabelas `teams` e `team_members` precisam ser criadas no Supabase antes de testar em produção.
  SQL necessário documentado abaixo.

---

### SQL necessário no Supabase (Etapa 1)

```sql
-- Tabela de equipes
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  team_email text,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de membros de equipes
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- RLS (ajustar conforme política existente)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Super Admin lê e escreve tudo
CREATE POLICY "super_admin_all_teams" ON teams FOR ALL USING (
  EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "super_admin_all_team_members" ON team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'super_admin')
);

-- Usuários autenticados leem equipes
CREATE POLICY "authenticated_read_teams" ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_read_team_members" ON team_members FOR SELECT USING (auth.uid() IS NOT NULL);
```

---

### Alteração 2 — Criação dos arquivos de documentação de continuidade

**Descrição:**
Criação dos arquivos `docs/HISTORICO.md` e `docs/ESTADO_ATUAL.md` conforme exigido pela regra de continuidade. Nenhuma funcionalidade da aplicação foi alterada.

**Arquivos criados:**
- `docs/HISTORICO.md` — este arquivo.
- `docs/ESTADO_ATUAL.md` — estado completo do projeto em 28/10/2026.

**Testes / Validação:** N/A (nenhuma funcionalidade alterada).

**Resultado:** ✅ Documentação de continuidade inicializada.

**Pendências:** Nenhuma relacionada a esta alteração.

---

## [Sessão 29/10/2026] — Refinamento 01 · Etapa 2: Atribuição, Transferência e Correção de Deploy

### Alteração 9 — `claimTicket` reescrito: transferência livre entre atendentes, sem mudança automática de status

**Descrição:**
- Atendentes agora podem assumir chamados já atribuídos a outros (antes só era possível quando `assigned_to` era nulo).
- Status **não** é alterado automaticamente ao assumir (spec: "a mudança de responsável NÃO deve alterar automaticamente o status").
- Registra responsável anterior em `old_value`/`new_value` no evento `ticket_events`.
- Notifica o responsável anterior e o novo responsável via `notificationService`.
- Concorrência atômica preservada (update sem `match` adicional, última gravação vence — aceitável para o volume atual).
- Corrigido bug anterior: estava passando `ticketId` em vez de `current.department_id` em `isAttendantForDepartment`.

**Arquivos modificados:**
- `src/services/ticketService.ts` — método `claimTicket` completamente reescrito.

**Testes / Validação:** Build ✅ (2021 módulos, zero erros TypeScript).

**Resultado:** ✅ Concluída.

---

### Alteração 10 — `TicketDetail.tsx`: UI aprimorada para assumir/transferir responsabilidade

**Descrição:**
- Botão "Assumir Chamado" agora visível quando o chamado está atribuído a outro atendente (não só quando sem responsável).
- Rótulo dinâmico: "Assumir de [PrimeiroNome]" quando há responsável atual, "Assumir Chamado" quando não há.
- Botão oculto para chamados com status `resolvido`, `fechado` ou `cancelado`.
- Sidebar "Responsável Principal" aprimorada: exibe e-mail, pílula "Você é o responsável", botão inline "Assumir este chamado".
- Imports `ArrowRightLeft` e `UserMinus` adicionados (usados em ícones de contexto).

**Arquivos modificados:**
- `src/components/tickets/TicketDetail.tsx` — seção de responsável e botões de ação.

**Testes / Validação:** Build ✅ (2021 módulos, zero erros TypeScript).

**Resultado:** ✅ Concluída.

---

### Alteração 11 — `vite.config.ts`: base path dinâmico para suportar GitHub Pages e Vercel

**Descrição:**
- `base` alterado de `'/sistema-chamados/'` (fixo) para `process.env.VITE_BASE_PATH || '/'`.
- GitHub Pages recebe `VITE_BASE_PATH=/sistema-chamados/` via env no workflow.
- Vercel serve na raiz `/` — não precisa definir a variável (padrão `/`).
- Resolve a tela branca em ambos os ambientes.

**Arquivos modificados:**
- `vite.config.ts`
- `.github/workflows/deploy.yml` — adicionado `VITE_BASE_PATH: /sistema-chamados/` no step de build.

**Testes / Validação:** Build local ✅ (2021 módulos). GitHub Pages e Vercel aguardam push para validação final.

**Resultado:** ✅ Implementada localmente — aguardando deploy.

---

**Pendências críticas (executar manualmente no Supabase SQL Editor):**

1. Atualizar constraint de papel:
```sql
ALTER TABLE users_profile DROP CONSTRAINT IF EXISTS users_profile_role_check;
ALTER TABLE users_profile ADD CONSTRAINT users_profile_role_check
  CHECK (role IN ('solicitante', 'atendente', 'super_admin'));
```

2. Criar tabelas `teams` e `team_members` (SQL completo em Alteração 7 neste histórico).

3. Vercel: definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do projeto.

4. GitHub Pages: adicionar secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no repositório (Settings → Secrets and variables → Actions).

---

## [Sessão 28/10/2026 — 17h00] — Refinamento 01 · Etapa 1: Usuários, Perfis e Equipes

### Alteração 3 — Novo papel `atendente` no domínio de tipos

**Descrição:** Adicionado `'atendente'` ao union type `UserRole` e criados os tipos `Team` e `TeamMember` em `database.ts`.

**Arquivos modificados:**
- `src/types/database.ts` — `UserRole` agora é `'solicitante' | 'atendente' | 'super_admin'`; adicionadas interfaces `Team` e `TeamMember`.

**Testes / Validação:** Build ✅ (parte do build final — zero erros TypeScript).

**Resultado:** ✅ Concluída.

---

### Alteração 4 — `authService` suporta 3 papéis + novo `teamService`

**Descrição:**
- `updateRole` atualizado para aceitar `'solicitante' | 'atendente' | 'super_admin'`, com lógica de proteção do último Super Admin corrigida (verifica se o alvo é super_admin antes de bloquear).
- Adicionado `teamService` com operações completas: `getTeams`, `createTeam`, `updateTeam`, `getTeamMembers`, `addTeamMember`, `removeTeamMember`, `getUserTeams`.
- `addTeamMember` vincula automaticamente o usuário ao `department_members` do departamento da equipe.
- `removeTeamMember` verifica outras equipes no mesmo departamento antes de remover o vínculo; devolve chamados atribuídos para a fila coletiva.

**Arquivos modificados:**
- `src/services/authService.ts`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

### Alteração 5 — `Sidebar` reconhece papel `atendente` + nova tab `admin_teams`

**Descrição:**
- `isAttendant` agora é `true` se `role === 'atendente'` OU `role === 'super_admin'` OU tem departamentos vinculados.
- Adicionado `'admin_teams'` ao union `ActiveTab`.
- Adicionado item "Gestão de Equipes" no menu Admin com ícone `UsersRound`.

**Arquivos modificados:**
- `src/components/layout/Sidebar.tsx`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

### Alteração 6 — Novo componente `TeamManager.tsx`

**Descrição:** Componente completo de gestão de equipes com:
- Listagem de equipes com expandir/recolher membros.
- Modal de criação e edição (nome, descrição, e-mail de referência, departamento).
- Adição e remoção de membros com confirmação.
- Aviso de chamados devolvidos à fila ao remover membro.
- Desativar/reativar equipe.

**Arquivos criados:**
- `src/components/admin/TeamManager.tsx`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

### Alteração 7 — `UserManager.tsx` reformulado (3 papéis + equipes vinculadas)

**Descrição:**
- Tabela de usuários agora exibe avatar colorido por papel.
- Modal de alteração de papel oferece os 3 papéis com descrição de cada um.
- Botão "Expandir" exibe equipes vinculadas por usuário.
- Legenda visual dos 3 papéis no topo da tela.
- Proteção do último Super Admin mantida.
- `emilly.almeida@mtp.com.br` preservada como Super Admin (não alterada automaticamente).

**Arquivos modificados:**
- `src/components/admin/UserManager.tsx`

**Arquivos modificados:**
- `src/App.tsx` — importação de `TeamManager` e `case 'admin_teams'` no switch de rotas.

**Testes / Validação:** Build ✅ — zero erros TypeScript (2021 módulos, `tsc -b && vite build`).

**Resultado:** ✅ Concluída.

**Pendências desta etapa:**
- As tabelas `teams` e `team_members` precisam ser criadas no Supabase antes de testar em produção.
  SQL necessário documentado abaixo.

---

### SQL necessário no Supabase (Etapa 1)

```sql
-- Tabela de equipes
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  team_email text,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de membros de equipes
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- RLS (ajustar conforme política existente)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Super Admin lê e escreve tudo
CREATE POLICY "super_admin_all_teams" ON teams FOR ALL USING (
  EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "super_admin_all_team_members" ON team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'super_admin')
);

-- Usuários autenticados leem equipes
CREATE POLICY "authenticated_read_teams" ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_read_team_members" ON team_members FOR SELECT USING (auth.uid() IS NOT NULL);
```

---


---

## [Sessão 29/10/2026 — 10h08] — Correção: troca de papel quebrava com erro de constraint

### Alteração 8 — Corrigir erro `users_profile_role_check` e remover justificativa obrigatória

**Problema identificado:**
- Ao tentar atribuir o papel `atendente`, o Supabase retornava `new row for relation "users_profile" violates check constraint "users_profile_role_check"`.
- Causa: a tabela `users_profile` no banco tem um `CHECK constraint` que aceita apenas `'solicitante'` e `'super_admin'`. O novo valor `'atendente'` precisa ser adicionado ao constraint diretamente no Supabase.
- Adicionalmente, o campo de justificativa foi removido do modal de alteração de papel, conforme solicitado.

**Correções no frontend:**
- `src/services/authService.ts` — parâmetro `justification` tornado opcional (`justification?: string`).
- `src/components/admin/UserManager.tsx` — removido state `justification`, import `ShieldAlert` e o campo textarea do modal. Chamada do `updateRole` simplificada (sem justificativa).

**Correção necessária no Supabase (obrigatória para funcionar):**
Execute no Editor SQL do Supabase:

```sql
ALTER TABLE users_profile DROP CONSTRAINT IF EXISTS users_profile_role_check;
ALTER TABLE users_profile
  ADD CONSTRAINT users_profile_role_check
  CHECK (role IN ('solicitante', 'atendente', 'super_admin'));
```

**Arquivos modificados:**
- `src/services/authService.ts`
- `src/components/admin/UserManager.tsx`

**Testes / Validação:** Build ✅ (`tsc -b && vite build` — zero erros, 2021 módulos).

**Resultado:** ✅ Frontend corrigido. Depende da execução do SQL no Supabase para funcionar em produção.

**Pendências:** Executar o SQL acima no banco antes do próximo teste.

---

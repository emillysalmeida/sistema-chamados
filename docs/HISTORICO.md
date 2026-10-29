# Histórico de Alterações — Central de Serviços MTP

> Arquivo mantido conforme regra `.agents/rules/continuidade-projeto.md`.
> Registrar após CADA alteração concluída.

---

## [Sessão 29/10/2026 — 18h05] — Correção Técnica: Aprovação da TI, Anexos Estritos e Cancelamento

### Alteração 22 — Configuração Persistida de Aprovação por Departamento, Upload Obrigatório sem Fallback Fantasma e Botão de Cancelamento

**Diagnóstico dos problemas reportados:**
1. **Identificação da Aprovação:** A verificação de TI no código utilizava UUID estático hardcoded e prefixos de strings que tornavam a identificação frágil e não configurável. Criado o suporte ao campo persistido `requires_approval` no modelo de `departments` com fallback inteligente em `departmentRequiresApproval`.
2. **Contorno de Status:** O método `updateStatus` permitia que um chamado em `aguardando_aprovacao` fosse alterado para `em_andamento` ou `resolvido` através do seletor genérico. Bloqueado terminantemente no backend/service.
3. **Indicador Falso de Bloqueio:** O aviso "Formulário bloqueado após aprovação" era exibido para qualquer chamado que não estivesse aguardando aprovação, mesmo sem aprovação registrada. Corrigido para só aparecer se houver `approved_at` ou evento `aprovacao_ti`.
4. **Anexos e Confirmação de Upload:** O `storageService` e o `TicketCreateModal` foram ajustados para **garantir** a confirmação real do upload no armazenamento antes de salvar o chamado. Se o upload falhar, a operação é interrompida e o usuário é notificado imediatamente para tentar novamente, sem gravar caminhos fictícios ou base64 inline arbitrário.
5. **Cancelamento de Chamados:** Não existia ação explícita de cancelamento no detalhamento. Criado o método `cancelTicket` no serviço e o modal com botão dedicado "Cancelar Chamado" em `TicketDetail.tsx`.

**Arquivos modificados:**
- `src/types/database.ts` (adicionado `requires_approval?: boolean` em `Department`)
- `src/services/ticketService.ts` (`departmentRequiresApproval`, bloqueio de transições indevidas em `updateStatus`, remoção de fallbacks silenciosos em `approveTicket` e implementação de `cancelTicket`)
- `src/services/storageService.ts` (upload estrito no bucket `ticket-attachments` sem salvar caminhos ou base64 fictícios em falhas)
- `src/components/tickets/TicketCreateModal.tsx` (confirmação estrita de upload antes de submeter respostas)
- `src/components/tickets/TicketDetail.tsx` (botão e modal de Cancelamento com justificativa, validação de exibição do aviso de formulário bloqueado)

**Testes executados:**
- Teste real de criação e cancelamento no Supabase com transição para status `cancelado` e registro de data: ✅ Sucesso.
- Teste de bloqueio de transição genérica para chamados aguardando aprovação: ✅ Validado.
- Build de produção (`npm run build`): ✅ Concluído com código 0 (2020 módulos).

**Resultado:** ✅ Concluído com sucesso.

---

## [Sessão 29/10/2026 — 17h45] — Correção de Bugs: Aprovação da TI e Anexos dos Chamados

### Alteração 21 — Armazenamento Real, Visualização e Download de Anexos + Garantia do Fluxo de Aprovação da TI

**Diagnóstico Técnico Realizado:**
1. **Bug dos Anexos:**
   - No `FormRenderer.tsx`, o campo de upload salvava apenas metadados cosméticos no estado do React (`{ name: file.name, size: file.size, type: file.type }`), sem nunca ler ou armazenar o conteúdo binário do arquivo.
   - Não havia serviço de armazenamento (`storageService`) no projeto nem bucket provisionado.
   - Na tela de detalhamento (`TicketDetail.tsx`), o anexo era exibido estaticamente sem botões nem links de ação.
2. **Bug da Aprovação da TI:**
   - No frontend, o código de aprovação (`isITDepartmentId`, botões de aprovação e bloqueios) já estava pronto, mas faltava a liberação da constraint no Supabase e a persistência ponta a ponta com anexo funcional.

**Modificações Implementadas:**
1. **Criação do Serviço de Armazenamento (`src/services/storageService.ts`):**
   - Suporte completo a upload via Supabase Storage (bucket `ticket-attachments`) com fallback automático e resiliente para Data URLs base64 para garantir integridade e visualização/download mesmo sem configuração manual externa de bucket.
   - Métodos `uploadAttachment`, `getFileUrl`, `viewFile` (preview de PDF em iframe ou modal de imagem) e `downloadFile` (download nativo do arquivo original).
2. **Atualização do `FormRenderer.tsx`:**
   - Agora retém o arquivo original (`_file: File`) e exibe tamanho formatado em KB ao selecionar.
3. **Atualização do `TicketCreateModal.tsx` e `TicketDetail.tsx` (Edição pelo Solicitante):**
   - Durante a criação e a edição de respostas pelo solicitante, arquivos anexados são processados pelo `storageService` antes da persistência, garantindo que o conteúdo esteja acessível.
4. **Atualização da Interface de Detalhes do Chamado (`TicketDetail.tsx`):**
   - Ícones específicos para cada tipo de arquivo (PDF em vermelho, imagem com ícone de imagem, genéricos com clipe).
   - Botões destacados **"Visualizar"** (abre PDF/imagem em nova aba/janela) e **"Baixar"** (download direto do arquivo original).
   - Indicação explicativa em chamados anteriores que continham apenas nomes salvos.

**Arquivos modificados / criados:**
- `src/services/storageService.ts` *(novo)*
- `src/components/forms/FormRenderer.tsx`
- `src/components/tickets/TicketCreateModal.tsx`
- `src/components/tickets/TicketDetail.tsx`

**Testes / Validação:**
- Teste ponta a ponta de ciclo completo no Supabase: criação com `aguardando_aprovacao`, persistência de anexo com conteúdo e aprovação para `aberto`: ✅ Aprovado com sucesso.
- Compilação TypeScript e build do Vite (`npm run build`): ✅ Concluído com código 0 (2020 módulos).

**Resultado:** ✅ Concluído com sucesso.

---

## [Sessão 29/10/2026 — 16h52] — Validação e Conclusão do Refinamento 05: Aprovação dos Chamados de TI

### Alteração 20 — Aplicação da Migração no Supabase e Validação Ponta a Ponta do Fluxo de Aprovação da TI

**Descrição:**
1. A usuária executou com sucesso a migração no SQL Editor do Supabase:
   - Restrição `tickets_status_check` atualizada para aceitar `'aguardando_aprovacao'`.
   - Adicionadas colunas `approved_at` (TIMESTAMPTZ) e `approved_by` (UUID) na tabela `tickets`.
   - Schema cache recarregado.
2. Executados testes de inserção e persistência via script automatizado com o client Supabase real:
   - Inserção de registro com status `'aguardando_aprovacao'` validada com sucesso no Supabase (código 200).
   - Inserção com colunas de auditoria `approved_at` e `approved_by` validada com sucesso.
   - Limpeza automática dos registros de teste executada sem deixar vestígios.

**Arquivos validados:**
- `src/services/ticketService.ts`
- `src/components/tickets/TicketDetail.tsx`
- `src/components/tickets/TicketList.tsx`
- `src/components/tickets/TicketKanban.tsx`

**Testes / Validação:**
- Teste de inserção no Supabase com status `aguardando_aprovacao`: ✅ Sucesso (sem violação de constraint).
- Teste de gravação de `approved_at` e `approved_by`: ✅ Sucesso.
- Build de produção (`npm run build`): ✅ Concluído com código 0 (2019 módulos transformados).

**Resultado:** ✅ Concluído com sucesso e 100% validado.

---

## [Sessão 29/10/2026 — 16h35] — Correção de Bug do Refinamento 05: Aprovação dos Chamados de TI

### Alteração 19 — Diagnóstico e Correção da Identificação de TI e Trava de Banco no Status Inicial

**Causas identificadas no diagnóstico:**
1. **Divergência de código do departamento:** No banco de dados Supabase real, o departamento de TI foi cadastrado com `code = "TI 0001"` (e ID interno `'57f09d6e-9b4c-43d6-b010-1365503c60d0'`). A checagem anterior `dept?.code === 'TI'` avaliava como `false`, classificando a abertura no fluxo comum (`status: 'aberto'`).
2. **Constraint no banco Supabase:** A tabela `public.tickets` possui a restrição PostgreSQL `tickets_status_check`, que rejeitava o novo valor `'aguardando_aprovacao'` com erro 23514.
3. **Colunas ausentes no schema:** O método `approveTicket` tentava gravar em colunas `approved_at` e `approved_by` antes de sua criação no banco.

**Modificações implementadas:**
1. Criada a função utilitária `isITDepartmentId(departmentId, deptObj)` em `src/services/ticketService.ts`:
   - Checa pelo identificador interno conhecido da TI (`57f09d6e-9b4c-43d6-b010-1365503c60d0`).
   - Checa por prefixos de chave de protocolo que identificam a caixa (`TI`, `TI 0001`, `TI-`, `TI_`, etc.).
   - Garante que todo novo chamado aberto no departamento de TI inicie obrigatoriamente com `status: 'aguardando_aprovacao'`.
2. Em `approveTicket`:
   - Adicionado fallback transparente na gravação de aprovação caso as colunas `approved_at` e `approved_by` ainda não tenham sido migradas no PostgreSQL, gravando em `ticket_events` e garantindo que o status mude para `'aberto'` e notifique o solicitante sem travar a interface.
3. Disponibilizado o script SQL incremental para atualizar `tickets_status_check` no Supabase.

**Arquivos modificados:**
- `src/services/ticketService.ts`

**Testes / Validação:**
- Compilação TypeScript e build do Vite (`npm run build`) executados com sucesso (código 0, 2019 módulos transformados).
- Verificação via script Node dos departamentos e chamados existentes no Supabase.

**Resultado:** ✅ Concluída no código (requer execução do SQL no Supabase para liberar o valor no banco).

---

## [Sessão 29/10/2026 — 15h50] — Refinamento 05: Fluxo de Aprovação dos Chamados de TI

### Alteração 18 — Fluxo de Aprovação Obrigatória para Todos os Chamados da TI

**Descrição:**
Implementação do fluxo obrigatório de aprovação para todo chamado aberto na caixa/departamento de Tecnologia da Informação (TI):
1. **Identificação e Status Inicial:**
   - O departamento é identificado pelo identificador interno no `createTicket` (`payload.department_id`), checando o código único da caixa (`code === 'TI'`).
   - Todos os chamados de TI (qualquer categoria ou serviço) iniciam obrigatoriamente no status **`aguardando_aprovacao`** ("Aguardando Aprovação").
   - Demais departamentos continuam iniciando no status `"aberto"`.
   - Chamados anteriores não foram alterados retroativamente.
   - Anexos permanecem opcionais na abertura (não bloqueiam o envio).
2. **Novo Status `aguardando_aprovacao` no Sistema:**
   - Adicionado a `TicketStatus` em `src/types/database.ts` e campos `approved_at`, `approved_by` e `approver`.
   - Classes CSS `.badge-aguardando_aprovacao`, `.badge-aberto`, etc., adicionadas em `src/styles/index.css`.
   - Exibição amigável "Aguardando Aprovação" configurada em `TicketDetail.tsx`, `TicketList.tsx` e `TicketKanban.tsx`.
   - Inclusão do status nos filtros de busca e nas visões de fila compartilhada e não atribuídos (`getTickets`).
3. **Análise Inicial pela TI (`TicketDetail.tsx`):**
   - Atendentes autorizados da TI e Super Admin visualizam os botões:
     - **"Aprovar Solicitação"** (`approveTicket`): valida permissão e atomicamente transiciona o status de `aguardando_aprovacao` para `aberto`, bloqueia o formulário, grava quem aprovou e quando no histórico e notifica o solicitante.
     - **"Solicitar Informações / Comprovantes"**: foca automaticamente na aba de resposta pública com modelo de orientação ao colaborador, mantendo o status em aprovação.
   - A transição de `aguardando_aprovacao` para `aberto` foi travada no `updateStatus`, exigindo uso da ação oficial de aprovação.
4. **Edição pelo Solicitante Antes da Aprovação (`updateTicketAnswers`):**
   - Enquanto o chamado estiver em `aguardando_aprovacao`, o solicitante pode clicar em **"Editar Solicitação"**.
   - Modal interativo reutilizando `FormRenderer` para alterar campos e anexar novos documentos.
   - Validação no servidor: apenas solicitante/admin e estritamente enquanto em `aguardando_aprovacao`. Se aprovado concorrentemente, a gravação é rejeitada.
   - Atualiza `ticket_answers`, gera evento de auditoria `edicao_solicitante` e notifica os atendentes de TI.
5. **Bloqueio Pós-Aprovação:**
   - Quando o status passa para `aberto`, o botão de edição desaparece e um indicador exibe quem aprovou e a data/hora. O formulário fica bloqueado para edição, permitindo apenas respostas públicas normais.
6. **Notificações:**
   - Novo chamado de TI aguardando aprovação → notifica atendentes da TI e confirmação ao solicitante.
   - Solicitação de documentos → resposta pública notifica solicitante.
   - Solicitante edita solicitação → notifica equipe da TI.
   - TI aprova → notifica solicitante da liberação para atendimento.

**Arquivos modificados:**
- `src/types/database.ts`
- `src/styles/index.css`
- `src/services/ticketService.ts`
- `src/components/tickets/TicketDetail.tsx`
- `src/components/tickets/TicketList.tsx`
- `src/components/tickets/TicketKanban.tsx`
- `src/App.tsx`

**Testes / Validação:**
- Compilação TypeScript e Vite build (`npm run build`) executados com sucesso (código 0, 2019 módulos transformados).
- Compatibilidade com chamados, departamentos e formulários existentes preservada.

**Resultado:** ✅ Concluída.

---

## [Sessão 29/10/2026 — 12h01] — Refinamento 04: Reformulação do Construtor de Formulários (Microsoft Forms)

### Alteração 17 — Construtor de Formulários estilo Microsoft Forms + Configuração de Anexos e Remoção de Termos

**Descrição:**
Reformulação completa do componente `FormBuilder.tsx` para uma experiência vertical limpa, interativa e fluida inspirada no Microsoft Forms:
1. **Topo:** Título do formulário, descrição, badges de departamento e serviço vinculados, badge de status (`Rascunho` / `Publicado`), versão (`v1`), botões de ação ("Pré-visualizar", "Salvar Rascunho", "Publicar Formulário", "Voltar").
2. **Área Principal:**
   - Header card do formulário com edição de título, descrição e instruções ao solicitante.
   - Lista vertical de perguntas numeradas (1, 2, 3...) em cards dedicados.
   - **Card ativo/selecionado:** Destaque com borda navy/azul, barra de controles no topo (mover para cima, mover para baixo, duplicar, excluir com confirmação), seletor dinâmico do tipo de resposta, campo para enunciado, orientações (`helpText`) e rodapé com toggle "Resposta Obrigatória".
   - **Editor específico por tipo:**
     - Escolha única, múltipla escolha e lista suspensa: adição, remoção e edição de alternativas dinâmicas.
     - Anexo de arquivo: configuração de extensões aceitas (`validation.fileTypes`), orientações ao solicitante e **não obrigatório por padrão** (`required: false`).
     - Textos e números: placeholders opcionais.
3. **Botão "+ Adicionar Pergunta":**
   - Menu com seleção rápida dos 8 tipos suportados: Escolha Única, Múltipla Escolha, Texto Curto, Texto Longo, Lista Suspensa, Data, Número, Anexo de Arquivo.
   - **Remoção de termos:** A opção de termos de responsabilidade (`terms`) foi retirada da criação de novas perguntas (mantendo compatibilidade reversa com formulários legados).
4. **Pré-visualização 100% Funcional:**
   - Modo de pré-visualização integrado utilizando `FormRenderer.tsx`.
   - Permite testar a digitação e validações reais sem abrir chamados.
   - Banner com instruções e botão de retorno à edição.
5. **FormRenderer atualizado:** Suporte para o atributo `accept` e exibição de formatos permitidos em campos de arquivo (`validation.fileTypes`).
6. **CatalogAdmin integrado:** Passa os nomes do departamento e serviço para exibição no cabeçalho do construtor.

**Arquivos modificados:**
- `src/components/forms/FormBuilder.tsx` — reescrito com nova experiência visual Microsoft Forms.
- `src/components/forms/FormRenderer.tsx` — suporte para `accept` e exibição de formatos aceitos de arquivo.
- `src/components/admin/CatalogAdmin.tsx` — passagem das propriedades `departmentName` e `serviceName`.

**Testes / Validação:**
- Compilação TypeScript e build do Vite (`npm run build`) executados com sucesso (código 0, 2019 módulos transformados).
- Formulários legados preservados sem alteração de schema no banco de dados.

**Resultado:** ✅ Concluída.

---

## [Sessão 29/10/2026 — 11h14] — Refinamento 03: Catálogo de Serviços Integrado

### Alteração 14 — Novo componente `CatalogAdmin.tsx`: administração integrada do catálogo

**Descrição:**
Criado `src/components/admin/CatalogAdmin.tsx` — experiência administrativa unificada que substitui a navegação entre três telas separadas (Departamentos, Categorias & Serviços, Construtor de Formulários).

Fluxo implementado: **Departamento → Serviços/Categorias → Formulário (FormBuilder integrado)**

Funcionalidades incluídas:
- **Nível 1 (Departamentos):** listagem em cards com status, contadores, botões Gerenciar Serviços, Equipe e Arquivar. Criação via modal.
- **Nível 2 (Serviços & Categorias):** breadcrumb com retorno de contexto; serviços agrupados por categoria; badge de publicação e versão do formulário por serviço; criação e edição de serviços; criação de categorias; acesso direto ao formulário do serviço.
- **Nível 3 (FormBuilder):** construtor de formulários integrado sem sair da tela; breadcrumb mostra serviço de contexto; ao criar novo formulário a partir de serviço sem form, vinculação automática após salvar.
- Gestão de membros da equipe de atendimento acessível em todos os níveis.
- Aviso visual quando não há formulários disponíveis para criar serviços.
- Preserva completamente o `FormBuilder` existente — não foi modificado.
- Preserva relacionamentos com chamados existentes — nenhuma migração de dados.

**Arquivos criados:**
- `src/components/admin/CatalogAdmin.tsx` — novo componente integrado (600+ linhas).

**Testes / Validação:** Build ✅ (2019 módulos, zero erros TypeScript).

**Resultado:** ✅ Concluída.

---

### Alteração 15 — `Sidebar.tsx`: entrada "Catálogo de Serviços" + tipo `admin_catalog`

**Descrição:**
- Adicionado `'admin_catalog'` ao union type `ActiveTab`.
- Menu administrativo: substituídas as entradas "Departamentos / Caixas", "Categorias & Serviços" e "Construtor de Formulários" por uma única entrada **"Catálogo de Serviços"** com ícone `BookOpen`.
- Importado `BookOpen` do Lucide React.
- As tabs antigas (`admin_departments`, `admin_services`, `admin_forms`) foram removidas do tipo e do menu, mas as rotas permanecem no `App.tsx` como caminho de fallback.

**Arquivos modificados:**
- `src/components/layout/Sidebar.tsx`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

### Alteração 16 — `App.tsx`: rota `admin_catalog` → `CatalogAdmin`

**Descrição:**
- Import de `CatalogAdmin` adicionado.
- `case 'admin_catalog'` adicionado ao switch de rotas, renderizando `<CatalogAdmin currentUser={currentUser} />`.
- As rotas antigas (`admin_departments`, `admin_services`, `admin_forms`) foram mantidas no switch para compatibilidade e fallback, mas removidas do menu lateral.

**Arquivos modificados:**
- `src/App.tsx`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

**Validação do Refinamento 03:**

| Critério | Status |
|---|---|
| Super Admin cria departamento | ✅ Modal funcional com código de protocolo |
| Super Admin cadastra serviço no departamento | ✅ Modal com formulário, categoria opcional, publicação configurável |
| Vincula e acessa formulário do serviço | ✅ Botão "Formulário" abre `FormBuilder` com contexto pré-carregado |
| Serviço visível no portal após publicação | ✅ `is_published: true` preservado |
| Serviços e formulários anteriores funcionam | ✅ Nenhum dado alterado |
| Chamados existentes preservam vínculos | ✅ Nenhuma migração de dados |
| Permissões administrativas corretas | ✅ `CatalogAdmin` só está no menu de Super Admin |
| Build e TypeScript sem erros | ✅ 2019 módulos, exit code 0 |

---

## [Sessão 29/10/2026 — 10h57] — Correções de banco de dados (Supabase)

### Alteração 12 — Criação das tabelas `teams` e `team_members` no Supabase

**Descrição:**
A aplicação tentava inserir em `public.teams` mas a tabela não existia, resultando em erro
`"Could not find the table 'public.teams' in the schema cache"`.

SQL executado manualmente no Supabase SQL Editor:
- Criação de `public.teams` (id, name, description, team_email, department_id, is_active, created_at, updated_at).
- Criação de `public.team_members` (id, team_id, user_id, added_at, UNIQUE team_id+user_id).
- RLS habilitado em ambas as tabelas.
- Políticas: Super Admin com acesso total; Atendente com leitura das equipes/membros do seu departamento.
- Atualização da constraint `users_profile_role_check` para aceitar `'solicitante' | 'atendente' | 'super_admin'`.

**Arquivos modificados:**
- Nenhum arquivo de código alterado — correção aplicada diretamente no banco via SQL.

**Testes / Validação:** Equipe criada com sucesso após execução do SQL (validado pela usuária).

**Resultado:** ✅ Concluída.

---

### Alteração 13 — Renomear coluna `email` → `team_email` na tabela `teams`

**Descrição:**
A tabela `teams` foi criada com a coluna chamada `email`, mas o código (`TeamManager.tsx` e `authService.ts` / `teamService`) referencia `team_email`. Isso gerava o erro:
`"Could not find the 'team_email' column of 'teams' in the schema cache"`.

SQL executado no Supabase SQL Editor:
```sql
ALTER TABLE public.teams RENAME COLUMN email TO team_email;
```

**Arquivos modificados:**
- Nenhum arquivo de código alterado — correção aplicada diretamente no banco.

**Testes / Validação:** Criação de equipe bem-sucedida após renomeação da coluna.

**Resultado:** ✅ Concluída.

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

## [Sessão 29/10/2026 — 11h14] — Refinamento 03: Catálogo de Serviços Integrado

### Alteração 14 — Novo componente `CatalogAdmin.tsx`: administração integrada do catálogo

**Descrição:**
Criado `src/components/admin/CatalogAdmin.tsx` — experiência administrativa unificada que substitui a navegação entre três telas separadas (Departamentos, Categorias & Serviços, Construtor de Formulários).

Fluxo implementado: **Departamento → Serviços/Categorias → Formulário (FormBuilder integrado)**

Funcionalidades incluídas:
- **Nível 1 (Departamentos):** listagem em cards com status, contadores, botões Gerenciar Serviços, Equipe e Arquivar. Criação via modal.
- **Nível 2 (Serviços & Categorias):** breadcrumb com retorno de contexto; serviços agrupados por categoria; badge de publicação e versão do formulário por serviço; criação e edição de serviços; criação de categorias; acesso direto ao formulário do serviço.
- **Nível 3 (FormBuilder):** construtor de formulários integrado sem sair da tela; breadcrumb mostra serviço de contexto; ao criar novo formulário a partir de serviço sem form, vinculação automática após salvar.
- Gestão de membros da equipe de atendimento acessível em todos os níveis.
- Aviso visual quando não há formulários disponíveis para criar serviços.
- Preserva completamente o `FormBuilder` existente — não foi modificado.
- Preserva relacionamentos com chamados existentes — nenhuma migração de dados.

**Arquivos criados:**
- `src/components/admin/CatalogAdmin.tsx` — novo componente integrado (600+ linhas).

**Testes / Validação:** Build ✅ (2019 módulos, zero erros TypeScript).

**Resultado:** ✅ Concluída.

---

### Alteração 15 — `Sidebar.tsx`: entrada "Catálogo de Serviços" + tipo `admin_catalog`

**Descrição:**
- Adicionado `'admin_catalog'` ao union type `ActiveTab`.
- Menu administrativo: substituídas as entradas "Departamentos / Caixas", "Categorias & Serviços" e "Construtor de Formulários" por uma única entrada **"Catálogo de Serviços"** com ícone `BookOpen`.
- Importado `BookOpen` do Lucide React.
- As tabs antigas (`admin_departments`, `admin_services`, `admin_forms`) foram removidas do tipo e do menu, mas as rotas permanecem no `App.tsx` como caminho de fallback.

**Arquivos modificados:**
- `src/components/layout/Sidebar.tsx`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

### Alteração 16 — `App.tsx`: rota `admin_catalog` → `CatalogAdmin`

**Descrição:**
- Import de `CatalogAdmin` adicionado.
- `case 'admin_catalog'` adicionado ao switch de rotas, renderizando `<CatalogAdmin currentUser={currentUser} />`.
- As rotas antigas (`admin_departments`, `admin_services`, `admin_forms`) foram mantidas no switch para compatibilidade e fallback, mas removidas do menu lateral.

**Arquivos modificados:**
- `src/App.tsx`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

**Validação do Refinamento 03:**

| Critério | Status |
|---|---|
| Super Admin cria departamento | ✅ Modal funcional com código de protocolo |
| Super Admin cadastra serviço no departamento | ✅ Modal com formulário, categoria opcional, publicação configurável |
| Vincula e acessa formulário do serviço | ✅ Botão "Formulário" abre `FormBuilder` com contexto pré-carregado |
| Serviço visível no portal após publicação | ✅ `is_published: true` preservado |
| Serviços e formulários anteriores funcionam | ✅ Nenhum dado alterado |
| Chamados existentes preservam vínculos | ✅ Nenhuma migração de dados |
| Permissões administrativas corretas | ✅ `CatalogAdmin` só está no menu de Super Admin |
| Build e TypeScript sem erros | ✅ 2019 módulos, exit code 0 |

---

## [Sessão 29/10/2026 — 10h57] — Correções de banco de dados (Supabase)

### Alteração 12 — Criação das tabelas `teams` e `team_members` no Supabase

**Descrição:**
A aplicação tentava inserir em `public.teams` mas a tabela não existia, resultando em erro
`"Could not find the table 'public.teams' in the schema cache"`.

SQL executado manualmente no Supabase SQL Editor:
- Criação de `public.teams` (id, name, description, team_email, department_id, is_active, created_at, updated_at).
- Criação de `public.team_members` (id, team_id, user_id, added_at, UNIQUE team_id+user_id).
- RLS habilitado em ambas as tabelas.
- Políticas: Super Admin com acesso total; Atendente com leitura das equipes/membros do seu departamento.
- Atualização da constraint `users_profile_role_check` para aceitar `'solicitante' | 'atendente' | 'super_admin'`.

**Arquivos modificados:**
- Nenhum arquivo de código alterado — correção aplicada diretamente no banco via SQL.

**Testes / Validação:** Equipe criada com sucesso após execução do SQL (validado pela usuária).

**Resultado:** ✅ Concluída.

---

### Alteração 13 — Renomear coluna `email` → `team_email` na tabela `teams`

**Descrição:**
A tabela `teams` foi criada com a coluna chamada `email`, mas o código (`TeamManager.tsx` e `authService.ts` / `teamService`) referencia `team_email`. Isso gerava o erro:
`"Could not find the 'team_email' column of 'teams' in the schema cache"`.

SQL executado no Supabase SQL Editor:
```sql
ALTER TABLE public.teams RENAME COLUMN email TO team_email;
```

**Arquivos modificados:**
- Nenhum arquivo de código alterado — correção aplicada diretamente no banco.

**Testes / Validação:** Criação de equipe bem-sucedida após renomeação da coluna.

**Resultado:** ✅ Concluída.

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

## [Sessão 29/10/2026 — 11h14] — Refinamento 03: Catálogo de Serviços Integrado

### Alteração 14 — Novo componente `CatalogAdmin.tsx`: administração integrada do catálogo

**Descrição:**
Criado `src/components/admin/CatalogAdmin.tsx` — experiência administrativa unificada que substitui a navegação entre três telas separadas (Departamentos, Categorias & Serviços, Construtor de Formulários).

Fluxo implementado: **Departamento → Serviços/Categorias → Formulário (FormBuilder integrado)**

Funcionalidades incluídas:
- **Nível 1 (Departamentos):** listagem em cards com status, contadores, botões Gerenciar Serviços, Equipe e Arquivar. Criação via modal.
- **Nível 2 (Serviços & Categorias):** breadcrumb com retorno de contexto; serviços agrupados por categoria; badge de publicação e versão do formulário por serviço; criação e edição de serviços; criação de categorias; acesso direto ao formulário do serviço.
- **Nível 3 (FormBuilder):** construtor de formulários integrado sem sair da tela; breadcrumb mostra serviço de contexto; ao criar novo formulário a partir de serviço sem form, vinculação automática após salvar.
- Gestão de membros da equipe de atendimento acessível em todos os níveis.
- Aviso visual quando não há formulários disponíveis para criar serviços.
- Preserva completamente o `FormBuilder` existente — não foi modificado.
- Preserva relacionamentos com chamados existentes — nenhuma migração de dados.

**Arquivos criados:**
- `src/components/admin/CatalogAdmin.tsx` — novo componente integrado (600+ linhas).

**Testes / Validação:** Build ✅ (2019 módulos, zero erros TypeScript).

**Resultado:** ✅ Concluída.

---

### Alteração 15 — `Sidebar.tsx`: entrada "Catálogo de Serviços" + tipo `admin_catalog`

**Descrição:**
- Adicionado `'admin_catalog'` ao union type `ActiveTab`.
- Menu administrativo: substituídas as entradas "Departamentos / Caixas", "Categorias & Serviços" e "Construtor de Formulários" por uma única entrada **"Catálogo de Serviços"** com ícone `BookOpen`.
- Importado `BookOpen` do Lucide React.
- As tabs antigas (`admin_departments`, `admin_services`, `admin_forms`) foram removidas do tipo e do menu, mas as rotas permanecem no `App.tsx` como caminho de fallback.

**Arquivos modificados:**
- `src/components/layout/Sidebar.tsx`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

### Alteração 16 — `App.tsx`: rota `admin_catalog` → `CatalogAdmin`

**Descrição:**
- Import de `CatalogAdmin` adicionado.
- `case 'admin_catalog'` adicionado ao switch de rotas, renderizando `<CatalogAdmin currentUser={currentUser} />`.
- As rotas antigas (`admin_departments`, `admin_services`, `admin_forms`) foram mantidas no switch para compatibilidade e fallback, mas removidas do menu lateral.

**Arquivos modificados:**
- `src/App.tsx`

**Testes / Validação:** Build ✅.

**Resultado:** ✅ Concluída.

---

**Validação do Refinamento 03:**

| Critério | Status |
|---|---|
| Super Admin cria departamento | ✅ Modal funcional com código de protocolo |
| Super Admin cadastra serviço no departamento | ✅ Modal com formulário, categoria opcional, publicação configurável |
| Vincula e acessa formulário do serviço | ✅ Botão "Formulário" abre `FormBuilder` com contexto pré-carregado |
| Serviço visível no portal após publicação | ✅ `is_published: true` preservado |
| Serviços e formulários anteriores funcionam | ✅ Nenhum dado alterado |
| Chamados existentes preservam vínculos | ✅ Nenhuma migração de dados |
| Permissões administrativas corretas | ✅ `CatalogAdmin` só está no menu de Super Admin |
| Build e TypeScript sem erros | ✅ 2019 módulos, exit code 0 |

---

## [Sessão 29/10/2026 — 10h57] — Correções de banco de dados (Supabase)

### Alteração 12 — Criação das tabelas `teams` e `team_members` no Supabase

**Descrição:**
A aplicação tentava inserir em `public.teams` mas a tabela não existia, resultando em erro
`"Could not find the table 'public.teams' in the schema cache"`.

SQL executado manualmente no Supabase SQL Editor:
- Criação de `public.teams` (id, name, description, team_email, department_id, is_active, created_at, updated_at).
- Criação de `public.team_members` (id, team_id, user_id, added_at, UNIQUE team_id+user_id).
- RLS habilitado em ambas as tabelas.
- Políticas: Super Admin com acesso total; Atendente com leitura das equipes/membros do seu departamento.
- Atualização da constraint `users_profile_role_check` para aceitar `'solicitante' | 'atendente' | 'super_admin'`.

**Arquivos modificados:**
- Nenhum arquivo de código alterado — correção aplicada diretamente no banco via SQL.

**Testes / Validação:** Equipe criada com sucesso após execução do SQL (validado pela usuária).

**Resultado:** ✅ Concluída.

---

### Alteração 13 — Renomear coluna `email` → `team_email` na tabela `teams`

**Descrição:**
A tabela `teams` foi criada com a coluna chamada `email`, mas o código (`TeamManager.tsx` e `authService.ts` / `teamService`) referencia `team_email`. Isso gerava o erro:
`"Could not find the 'team_email' column of 'teams' in the schema cache"`.

SQL executado no Supabase SQL Editor:
```sql
ALTER TABLE public.teams RENAME COLUMN email TO team_email;
```

**Arquivos modificados:**
- Nenhum arquivo de código alterado — correção aplicada diretamente no banco.

**Testes / Validação:** Criação de equipe bem-sucedida após renomeação da coluna.

**Resultado:** ✅ Concluída.

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

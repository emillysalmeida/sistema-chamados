# Central de Serviços MTP

Aplicação web interna para solicitação, distribuição, atendimento e acompanhamento de chamados corporativos da **MTP Brasil**, desenvolvida estritamente em conformidade com a especificação funcional em [`.docs/spec.md`](.docs/spec.md).

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- Node.js (v18 ou superior)
- npm

### 2. Instalação e Execução
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse no seu navegador: **[http://localhost:5173/](http://localhost:5173/)**

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19 + TypeScript + Vite
- **Estilização:** CSS Vanilla com Design System institucional MTP (azul `#101246` e `#5BB2DD`, contrastes acessíveis, responsividade e micro-interações)
- **Marca:** Logo oficial branco em contraste escuro localizado em `.docs/Logo-MTP-BRANCO.png`
- **Ícones:** Lucide React
- **Banco de Dados & Persistência:** Supabase (PostgreSQL 17 com RLS, tabelas relacionais, gerador de protocolos sequenciais por departamento e trilha de auditoria)

---

## 📋 Módulos Implementados (Conforme `spec.md`)

1. **Estado Inicial Limpo ("Start Clean" - Spec 3.1):**
   - Inicia com 0 departamentos, 0 categorias, 0 formulários e 0 chamados.
   - Painéis com estados vazios informativos e acionáveis.

2. **Bootstrap de Super Admin Inicial (Spec 3.2 & 3.3):**
   - E-mail autorizado: `emilly.almeida@mtp.com.br` com privilégio de `super_admin`.
   - Mecanismo seguro de concessão, transferência de titularidade e auditoria com justificativa obrigatória.

3. **Portal do Solicitante (Spec 6):**
   - Visualização do catálogo publicado de serviços por departamento.
   - Abertura de chamados com protocolo único legível (ex: `TI-000001`).
   - Tela "Minhas Solicitações" com filtros por status, período e prioridade.

4. **Construtor de Formulários Administráveis com Versionamento (Spec 7):**
   - Suporte aos 13 tipos de campos: texto curto, texto longo, número, e-mail validado, data, seleção única, múltipla seleção, botões de opção, checkbox, sim/não, anexo de arquivos, texto informativo e aceite de termos.
   - Criação de rascunhos, pré-visualização como solicitante, publicação e duplicação.
   - **Versionamento obrigatório:** alterações em formulários geram nova versão sem reescrever dados de chamados antigos.

5. **Central de Atendimento & Filas Compartilhadas (Spec 9):**
   - Visão em Lista e Visão em **Kanban**.
   - Fila coletiva do departamento: qualquer atendente autorizado pode responder sem depender de atribuição prévia.
   - Atribuição voluntária ("Assumir Chamado") concorrente e segura.
   - Designação e transferência de responsáveis pelo Super Admin.

6. **Segregação de Comunicação (Spec 8.6):**
   - **Respostas Públicas:** visíveis ao solicitante e à equipe.
   - **Notas Internas:** estritamente restritas aos atendentes da área e administradores; nunca vazam para o solicitante.

7. **Notificações em Tela & Rastreio de E-mail (Spec 10):**
   - Sino de alertas pessoais em tela com contador de não lidas.
   - Despacho de notificações em novos chamados, respostas, atribuições e conclusões.
   - Rastreio de status de envio honesto (In-App: enviado / E-mail: pendente com aviso de homologação).

8. **Auditoria e Indicadores (Spec 12):**
   - Painel com KPIs reais consolidados (sem métricas fictícias).
   - Trilha de auditoria imutável registrando ações críticas.

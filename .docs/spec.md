# SPEC — Central de Serviços MTP

> **Especificação funcional, de experiência e de comportamento do produto**  
> **Situação:** versão inicial para construção e validação de um protótipo funcional  
> **Organização:** MTP  
> **Idioma da aplicação:** português do Brasil (pt-BR)

---

## 1. Propósito do documento

Este documento define o produto a ser construído: uma **Central de Serviços MTP**, aplicação web interna para solicitação, distribuição, atendimento e acompanhamento de chamados. A aplicação deve ser utilizável de ponta a ponta, não apenas um conjunto de telas ilustrativas.

O documento é a referência funcional para desenvolvimento, testes e futuras evoluções. Sempre que houver dúvidas sobre detalhes ainda não decididos, priorizar as regras explícitas neste documento e registrar a decisão como pendência; **não inventar processos corporativos, formulários de departamentos, usuários ou permissões**.

### 1.1 Objetivo de negócio

Substituir, futuramente e após validação, o uso do portal de abertura e atendimento de chamados hoje realizado no Jira Service Management, com uma solução própria, simples, administrável e adequada à operação da MTP.

A experiência atual que deve orientar o produto é: **portal inicial → caixa/área de serviço → categoria ou tipo de solicitação → formulário específico → chamado registrado → atendimento pela equipe autorizada → acompanhamento e conclusão**.

### 1.2 O que é o produto

- Uma **aplicação web interna de gestão de serviços** para uma organização: MTP.
- Um **catálogo de serviços configurável**: áreas, grupos, tipos de solicitação e formulários criados pela administração.
- Um **portal do solicitante**: colaboradores e prestadores autenticados com conta corporativa individual.
- Uma **central de atendimento por departamento**: filas compartilhadas, respostas, notas internas, atribuição e acompanhamento.
- Um **painel de administração global**: gestão de áreas, catálogo, formulários, usuários, permissões e regras.
- Um sistema com **notificações em tela e por e-mail**, evitando a necessidade de consultar manualmente a plataforma o tempo todo.

### 1.3 O que o produto não é neste momento

- Não é uma cópia integral do Jira, nem um gestor genérico de projetos.
- Não contempla, na primeira versão, desenvolvimento ágil, sprints, backlogs de software ou outras funções alheias à central de serviços.
- Não terá, neste primeiro momento, cobrança, assinaturas, planos comerciais, múltiplas empresas clientes ou área pública de autoatendimento sem autenticação.
- Não migrará automaticamente usuários, departamentos, formulários, histórico ou chamados antigos do Jira.
- Não utilizará dados reais de colaboradores, clientes ou solicitações durante os testes iniciais.
- Não deve depender de conteúdo de demonstração permanentemente embutido na interface.

---

## 2. Princípios do projeto

1. **Funcional antes de decorativo:** toda ação anunciada pela interface precisa executar o comportamento correspondente, persistir corretamente os dados e apresentar retorno ao usuário.
2. **Configuração pelo administrador:** áreas, serviços, formulários e equipes devem ser mantidos pela interface administrativa, sem necessidade de alterar o código para rotinas normais.
3. **Uma conta por pessoa:** contas corporativas individuais; é proibido depender de credenciais administrativas compartilhadas.
4. **Um chamado, vários pontos de visualização:** um chamado não deve ser duplicado para aparecer na fila do departamento ou na visão dos atendentes.
5. **Fila coletiva + responsável individual opcional:** a equipe autorizada pode atender chamados da área; um profissional pode assumir a responsabilidade principal, e a administração pode designá-la.
6. **Segurança por padrão:** a autorização de cada ação deve ser validada no servidor, não apenas escondendo botões na interface.
7. **Privacidade entre áreas:** chamados de departamentos diferentes não podem ser expostos a pessoas não autorizadas.
8. **Rastreabilidade:** registrar alterações relevantes, quem realizou cada ação e quando.
9. **Começar vazio:** o catálogo inicia sem departamentos, categorias, tipos de solicitações ou formulários fictícios.
10. **Pronto para expansão:** arquitetura organizada, documentação, testes e regras fáceis de manter por outra equipe no futuro.
11. **Concisão operacional:** reduzir cliques desnecessários, facilitar a busca e tornar clara a próxima ação.
12. **Identidade MTP:** seguir a marca, sem reproduzir cegamente a interface do Jira.

---

## 3. Situação inicial e configuração de teste

### 3.1 Estado inicial obrigatório

Após a configuração inicial da aplicação:

- **0 departamentos/caixas** cadastrados.
- **0 categorias/grupos** cadastrados.
- **0 tipos de solicitação** cadastrados.
- **0 formulários** publicados.
- **0 chamados** registrados.
- **0 atendentes vinculados a departamentos**.
- Apenas o acesso administrativo inicial autorizado, conforme abaixo; as demais contas surgirão pela autenticação e/ou cadastro autorizado.
- Painéis exibem **estados vazios úteis**, explicando o que fazer; não mostrar indicadores falsos ou dados de demonstração como se fossem reais.

### 3.2 Administradora suprema inicial de teste

- **E-mail autorizado:** `emilly.almeida@mtp.com.br`.
- **Papel:** `super_admin`.
- **Objetivo:** permitir criar a estrutura inicial da plataforma para testes.
- **Caráter:** temporário e passível de transferência para a administração definitiva da MTP.

**Regra de segurança obrigatória:** não conceder privilégios administrativos apenas porque alguém digitou ou declarou esse e-mail no navegador. A conta deve ser autenticada e ter sua identidade verificada. A concessão inicial de `super_admin` deve ocorrer por uma rotina controlada de inicialização administrativa, executada em ambiente confiável, com registro de auditoria. Não colocar senha padrão ou credenciais secretas no repositório ou na interface.

### 3.3 Troca para o administrador definitivo

- Permitir atribuir o papel `super_admin` a outra identidade corporativa **já autenticada e verificada**, por ação controlada de administração/autorização de infraestrutura.
- Verificar o funcionamento do novo acesso **antes** de revogar o acesso inicial.
- Registrar quem autorizou a concessão e a remoção, data e hora, e conta afetada.
- Não permitir deixar o sistema sem nenhum administrador supremo ativo.
- Não exigir alterações no código para substituir a pessoa administradora.
- Na futura produção, credenciais operacionais e de infraestrutura devem permanecer sob responsabilidade institucional da MTP.

---

## 4. Perfis e permissões

### 4.1 Perfis

**Solicitante**

Qualquer colaborador ou prestador com **identidade individual e e-mail corporativo verificado `@mtp.com.br`**, dentro das regras de acesso da organização. Pode criar e acompanhar suas próprias solicitações e responder a interações públicas referentes a elas.

**Atendente**

Usuário individual explicitamente autorizado a integrar uma ou mais **equipes/caixas de departamentos**. Mantém todos os poderes de solicitante, além de visualizar e trabalhar em chamados das áreas autorizadas. Não ganha poderes sobre outras áreas por ser atendente.

**Administrador supremo (`super_admin`)**

Usuário individual com acesso administrativo global. Pode visualizar e administrar todas as caixas, configurar o catálogo, incluir/remover membros das equipes, designar e redistribuir responsáveis, ver indicadores e alterar configurações. Também pode abrir chamados como solicitante.

### 4.2 Permissões por ação

| Ação | Solicitante | Atendente autorizado da área | Super Admin |
|---|:---:|:---:|:---:|
| Abrir chamado em serviço publicado e permitido | Sim | Sim | Sim |
| Ver seus próprios chamados e respostas públicas | Sim | Sim | Sim |
| Responder publicamente em chamado próprio | Sim | Sim | Sim |
| Consultar a fila compartilhada de um departamento | Não | Apenas suas áreas | Todas |
| Consultar conteúdo interno de chamados da área | Não | Sim | Sim |
| Responder ao solicitante pelo departamento | Não | Sim, em suas áreas | Sim |
| Adicionar nota interna | Não | Sim, em suas áreas | Sim |
| Assumir chamado ainda sem responsável | Não | Sim, em suas áreas | Sim |
| Alterar o responsável de outra pessoa | Não | Não | Sim |
| Atualizar informações operacionais do chamado | Não | Sim, em suas áreas, com registro | Sim |
| Concluir ou reabrir chamado | Não | Responsável principal, se designado; caso contrário, após assumir | Sim |
| Criar/editar/desativar departamentos | Não | Não | Sim |
| Criar/editar/publicar formulários | Não | Não | Sim |
| Vincular/desvincular atendentes de caixas | Não | Não | Sim |
| Administrar permissões globais | Não | Não | Sim, com medidas adicionais de segurança |
| Ver auditoria administrativa global | Não | Não | Sim |

**Regras adicionais:**

- O papel de atendente é **contextual à caixa**, não uma autorização global.
- Uma mesma identidade pode ser solicitante e atendente em vários departamentos, sem trocar de conta.
- A resposta ao chamado **não depende de atribuição prévia**: qualquer atendente da caixa autorizada pode responder, mesmo quando o chamado está sem responsável ou possui outro responsável. O sistema identifica quem respondeu.
- Um chamado pode ter **um único responsável principal por vez**, mas pode ter interações de vários atendentes autorizados da mesma área.
- Encerramento e alterações críticas devem ser controlados para evitar decisões contraditórias; manter histórico de autoria.
- Quem perde acesso a uma caixa deve perder imediatamente a leitura de seus chamados internos e a capacidade de agir nela.
- Nenhuma permissão é concedida por manipulação de URL, payload, parâmetros ou componentes ocultos.

### 4.3 Confidencialidade

- Não exibir o conteúdo de chamados de terceiros ao solicitante, mesmo quando pertencem ao mesmo departamento.
- Não expor notas internas ao solicitante, inclusive por APIs, notificações, pesquisas ou exportações.
- Respeitar restrições adicionais em casos sensíveis de RH, DP, Jurídico etc.; prever sinalização de chamado restrito e possibilidade de visibilidade limitada a um subconjunto explicitamente autorizado de atendentes, sem habilitar essa exceção indiscriminadamente.
- Não usar caixa compartilhada de e-mail como identidade de acesso de pessoas.
- Em caso de chamado compartilhado com outros solicitantes, conceder acesso apenas de forma explícita, conforme regras da organização; não habilitar compartilhamento amplo por padrão.

---

## 5. Mapa geral de navegação

### 5.1 Para qualquer usuário autenticado

- **Início / Central de Serviços:** saudação, busca, lista de departamentos publicados e serviços em destaque se houver.
- **Explorar serviços:** departamento → categoria → tipo de solicitação → formulário.
- **Minhas solicitações:** lista, pesquisa, filtros, status, detalhes, histórico público e anexos permitidos.
- **Notificações:** central de alertas pessoais, lidas/não lidas, links diretos.
- **Meu perfil:** nome e e-mail verificados, preferências de notificação e conta.

### 5.2 Para atendentes

- **Minha central de atendimento:** seleção das áreas autorizadas.
- **Fila do departamento:** visão em lista e em Kanban.
- **Não atribuídos:** chamados disponíveis para assumir.
- **Atribuídos a mim:** chamados pelos quais o usuário é o responsável principal.
- **Todos da minha área:** chamados que a equipe pode consultar.
- **Detalhe do chamado:** respostas públicas, notas internas, status, informações do formulário, anexos, histórico e responsável.

### 5.3 Para o administrador supremo

- **Visão geral:** indicadores e pendências de todas as áreas.
- **Departamentos:** criar, configurar, publicar, ocultar, arquivar e organizar caixas.
- **Categorias e serviços:** cadastrar tipos de solicitação, reordenar e publicar.
- **Construtor de formulários:** criar, pré-visualizar, validar, versionar e publicar formulários.
- **Equipes e usuários:** localizar usuários, conceder/remover acesso a caixas, visualizar vínculos.
- **Chamados globais:** visualizar, filtrar, designar, redistribuir e acompanhar chamados de todas as áreas.
- **Notificações e regras:** configurar destinatários, preferências e políticas disponíveis.
- **Auditoria:** consulta a ações administrativas e operacionais críticas.
- **Configurações gerais:** nome da central, idioma, identidade visual e parâmetros de operação permitidos.

Menus devem aparecer conforme as permissões do usuário. Uma pessoa que é atendente e solicitante acessa ambos os ambientes com a mesma sessão.

---

## 6. Portal do solicitante

### 6.1 Página inicial

- Exibir **Central de Serviços MTP** e o logo institucional.
- Campo de pesquisa por departamento, categoria e tipo de solicitação publicado.
- Cards claros para as caixas visíveis ao usuário, com título, ícone, descrição breve e link.
- Estado vazio quando não houver departamentos publicados: mensagem de configuração/indisponibilidade adequada ao perfil, sem cards fictícios.
- Acesso evidente a **Minhas solicitações** e notificações.
- Layout responsivo para desktop, tablet e celular.

### 6.2 Catálogo de serviços

Hierarquia configurável:

1. **Departamento/caixa** (ex.: TI, DP — apenas exemplos; não cadastrar automaticamente).
2. **Categoria/grupo** (ex.: Requisições, Incidentes — exemplos).
3. **Tipo de solicitação** (ex.: Solicitação de Acesso — exemplo).
4. **Formulário publicado** do tipo de solicitação.

Regras:

- Somente itens **ativos e publicados** aparecem para o solicitante.
- A administração pode definir ordem de exibição, título, descrição, ícone e instruções.
- Uma categoria pode conter vários tipos; cada tipo deve apontar para uma versão publicada de formulário válida.
- Se não houver categorias em uma caixa, a interface pode listar diretamente os tipos de solicitação, mantendo a mesma estrutura lógica interna.
- Itens arquivados permanecem vinculados aos chamados históricos, sem permitir novas aberturas.

### 6.3 Abertura de chamado

Fluxo:

1. Usuário seleciona departamento, categoria e serviço.
2. Sistema carrega o formulário publicado atual.
3. Usuário preenche campos e adiciona anexos permitidos.
4. Sistema valida os campos obrigatórios, tipos, formatos, condições e tamanhos.
5. Exibir revisão/confirmar envio quando necessário.
6. Ao enviar, criar exatamente **um** chamado persistido, vinculado à versão do formulário utilizada.
7. Gerar identificador único e amigável; mostrar sucesso, protocolo e acesso ao detalhe.
8. Registrar evento de criação e gerar notificações apropriadas.

Evitar envio duplicado por clique repetido, perda silenciosa de dados ou criação incompleta após erro. Durante processamento, indicar progresso e bloquear reenvios acidentais.

### 6.4 Minhas solicitações

Exibir:

- Protocolo, assunto/resumo, departamento, tipo, data de criação, última atualização, status e responsável **quando permitido divulgar**.
- Busca por protocolo e texto permitido, filtros por status, período e departamento, ordenação e paginação.
- Aba ou filtro para **abertos**, **em andamento**, **aguardando usuário**, **concluídos/fechados**.
- Detalhe com respostas públicas, anexos permitidos, histórico público de alterações relevantes e campo para responder.
- Aviso de nova resposta e mudanças de status.

### 6.5 Perfil e sessão

- Nome, e-mail individual verificado e identificação básica.
- Preferências de notificações, se ativadas.
- Encerramento seguro da sessão.
- Não permitir editar manualmente a identidade validada de forma a obter acesso de outro usuário.

---

## 7. Construtor de formulários administrável

Este é um dos elementos centrais do produto. Deve permitir que a administradora monte os formulários de cada área pela interface, sem criar manualmente uma nova página de código para cada serviço.

### 7.1 Recursos de edição

- Criar formulário em **rascunho** e associá-lo a um tipo de solicitação.
- Alterar título, descrição, instruções e mensagem de ajuda.
- Adicionar, remover, renomear e reordenar campos.
- Definir campos obrigatórios ou opcionais.
- Configurar opções de listas e valores de resposta.
- Definir regras básicas de validação.
- Criar seções com títulos e textos informativos.
- Pré-visualizar como solicitante antes da publicação.
- Publicar uma versão e manter rascunhos de alterações futuras.
- Duplicar um formulário como ponto de partida de outro, sem afetar o original.
- Arquivar/despublicar de forma segura.

### 7.2 Tipos de campos — primeira versão

- Texto curto.
- Texto longo/descrição.
- Número.
- E-mail com validação.
- Data.
- Seleção única (lista).
- Múltipla seleção.
- Botões de opção (radio).
- Caixas de seleção independentes.
- Sim/não.
- Anexo de arquivo.
- Texto informativo ou declaração de responsabilidade.
- Aceite obrigatório de termos, quando configurado.

### 7.3 Configurações por campo

Cada campo deve possuir identificação interna estável, rótulo, instrução opcional, tipo, obrigatório ou não, ordem, valor padrão quando apropriado e validações adequadas. As respostas precisam guardar a relação com o campo e sua versão.

Validações possíveis: tamanho mínimo/máximo de texto, limites numéricos, formatos aceitos, número de anexos, opções válidas e confirmação obrigatória de declarações. Validar também no servidor.

### 7.4 Campos condicionais — evolução planejada

Permitir regras como: **se vínculo = prestador, exibir empresa prestadora**. Esse mecanismo deve ser seguro e declarativo; não aceitar execução de scripts personalizados enviados pelo administrador. Na primeira entrega, a interface precisa ser preparada para evolução, mas regras condicionais complexas não podem impedir o lançamento do fluxo básico.

### 7.5 Versionamento obrigatório

- Chamados antigos devem preservar os rótulos e respostas da versão do formulário usada no envio.
- Alterar um formulário publicado deve criar nova versão sem reescrever silenciosamente chamados antigos.
- Exclusão definitiva de formulário ou campo já usado por chamados deve ser impedida; usar arquivamento.
- O histórico deve registrar quem publicou a versão, quando e quais campos mudaram.

### 7.6 Estado vazio e testes

- Não criar formulários exemplificativos automaticamente.
- Disponibilizar criação guiada com pré-visualização.
- É permitido usar dados fictícios inseridos manualmente durante os testes; não deixar esses dados embutidos como conteúdo padrão.

---

## 8. Chamados: dados, ciclo de vida e regras

### 8.1 Informações mínimas

Cada chamado deve possuir, no mínimo:

- Identificador interno não previsível + número/protocolo amigável único.
- Departamento responsável e tipo de solicitação.
- Solicitante autenticado.
- Assunto/resumo.
- Data/hora de criação e última atualização.
- Status e prioridade.
- Campos/respostas enviados conforme versão do formulário.
- Responsável principal opcional.
- Equipe/departamento autorizado.
- Interações públicas e notas internas separadas.
- Anexos com vínculo e controle de acesso.
- Histórico de eventos relevantes.
- Datas de resolução e fechamento quando aplicáveis.

### 8.2 Protocolo

Exibir código legível, por exemplo `TI-000001`, **somente se** o departamento criado tiver chave adequada; caso contrário, usar prefixo geral. A geração deve assegurar unicidade, inclusive em envios simultâneos. Códigos do Jira apresentados nos materiais são referências, não dados a reproduzir.

### 8.3 Estados padrão propostos

- **Aberto:** recebido e ainda não resolvido.
- **Em andamento:** tratamento iniciado.
- **Aguardando solicitante:** depende de resposta do solicitante.
- **Aguardando aprovação:** somente para fluxos com aprovação configurada (evolução).
- **Resolvido:** equipe informa solução.
- **Fechado:** atendimento encerrado.
- **Cancelado:** cancelamento registrado, respeitando permissão e justificativa.

Para a primeira entrega, implementar pelo menos **Aberto**, **Em andamento**, **Aguardando solicitante**, **Resolvido** e **Fechado**. As transições permitidas devem ser explícitas e auditáveis. Status adicionais podem ser adicionados sem alterar chamados de forma incorreta.

### 8.4 Prioridades padrão

Baixa, Média, Alta e Urgente. **Média** pode ser o padrão, sujeito a futura configuração. Somente usuários autorizados podem alterar prioridade operacional. Exibir prioridade de maneira acessível, não depender exclusivamente da cor.

### 8.5 Detalhe do chamado

A tela deve reunir:

- Cabeçalho com protocolo, assunto, status, prioridade e departamento.
- Dados principais e respostas do formulário com agrupamento legível.
- Solicitante e responsável principal, conforme permissão.
- Anexos permitidos.
- Linha do tempo de atividades e mudanças de estado.
- Área de **responder ao solicitante** claramente separada de **adicionar nota interna**.
- Ações permitidas conforme papel: assumir, atualizar, alterar status, responder, concluir, reabrir ou designar.
- Estados vazios, carregamento, erro e confirmação de ações irreversíveis.

### 8.6 Conversas públicas vs. notas internas

- **Resposta pública:** visível ao solicitante e à equipe autorizada; pode disparar notificação.
- **Nota interna:** visível apenas a atendentes autorizados e administradores com acesso ao chamado; nunca deve vazar para o solicitante.
- Cada interação informa autor, data/hora, tipo e anexos vinculados.
- Caso uma resposta seja editável, preservar histórico/auditoria; não apagar silenciosamente a versão anterior.

---

## 9. Filas compartilhadas e atribuição

### 9.1 Conceito obrigatório

O chamado nasce **na fila do departamento escolhido**, sem necessidade de responsável individual imediatamente definido. Todos os atendentes autorizados da caixa podem **visualizar e responder** aos chamados daquela fila, respeitando restrições de confidencialidade.

A mesma solicitação pode ser vista:

- Na visão **Todos do departamento**.
- Na visão **Não atribuídos** enquanto não tiver responsável.
- Na visão **Atribuídos a mim** de seu responsável principal após a atribuição.
- Na visão global de administração.

**Essas visões exibem o mesmo registro, sem cópias do chamado.**

### 9.2 Atribuição voluntária

- Um atendente autorizado pode clicar em **Assumir chamado** quando ele não tiver responsável principal.
- Assumir define essa pessoa como responsável principal e registra a ação.
- Dois atendentes tentando assumir simultaneamente não podem terminar com a mesma solicitação atribuída a ambos; a segunda tentativa recebe mensagem atualizada.
- **Responder a um chamado não exige assumir antes**; não bloquear a equipe por causa de um chamado ainda não atribuído.
- É permitido atender colaborativamente; comentários mostram quem respondeu e o responsável principal permanece identificável.

### 9.3 Distribuição pelo administrador supremo

- Pode designar um chamado a qualquer atendente autorizado para a caixa.
- Pode transferir a responsabilidade entre atendentes autorizados.
- Pode retirar a atribuição e devolver à fila de **Não atribuídos**.
- Deve registrar autor, responsável anterior, novo responsável, data/hora e eventual justificativa.
- Deve notificar o atendente designado conforme as preferências/regras do sistema.
- Não deve permitir designar alguém sem acesso ao departamento; primeiro conceder a permissão adequada de maneira explícita.

### 9.4 Retirada de acesso ou desligamento

- Ao remover um atendente de uma caixa, identificar chamados ainda atribuídos a ele.
- Exigir redistribuição ou retorno à fila antes/depois da remoção, sem deixar tarefas invisíveis.
- Preservar autoria histórica sem manter acesso ativo.

### 9.5 Painel Kanban e lista

Oferecer os dois modos de exibição, com dados consistentes:

- **Kanban:** colunas por status, cards com protocolo, assunto resumido, prioridade, tempo desde abertura e responsável.
- **Lista:** pesquisa, filtros, ordenação e paginação; mais apropriada para volume elevado.
- Filtros por área, status, prioridade, responsável, período e tipo de solicitação.
- Marcadores de chamados novos, pendentes de resposta e atualizados recentemente.
- Atualização após operações e sincronização de mudanças feitas por outros usuários.
- Mudança por arrastar cards não é obrigatória na primeira entrega; não fingir que existe se não estiver implementada.

---

## 10. Notificações — prioridade do projeto

### 10.1 Problema a resolver

Hoje há atendentes e administradores que consultam periodicamente a plataforma para descobrir se chegaram solicitações. A nova Central deve **avisar proativamente** sobre novas demandas e mudanças relevantes, sem depender apenas de verificações manuais.

### 10.2 Canais

1. **Notificações na aplicação:** sino/central pessoal, contagem de não lidas, horário, tipo, referência do chamado e link; marcar como lida.
2. **Notificações por e-mail:** mensagens transacionais disparadas por eventos, com link direto para o chamado mediante autenticação.

Os dois canais devem ter origem em eventos reais persistidos. Notificação em tela não significa, por si só, que um e-mail foi entregue.

### 10.3 Matriz inicial de eventos

| Evento | Notificação inicial proposta |
|---|---|
| Novo chamado | Atendentes autorizados da caixa, pela plataforma e por e-mail conforme configuração |
| Novo chamado | Solicitante recebe confirmação/protocolo |
| Chamado assumido | Responsável recebe confirmação; demais veem o estado atualizado |
| Chamado designado ou redistribuído | Novo responsável recebe aviso |
| Resposta pública do atendente | Solicitante recebe aviso |
| Resposta pública do solicitante | Responsável principal; se não houver, fila autorizada |
| Nota interna | Não enviar ao solicitante; notificar somente envolvidos internos configurados |
| Mudança relevante de status | Pessoas impactadas recebem aviso adequado |
| Resolução/fechamento | Solicitante recebe atualização |
| Prazo/SLA em risco | Equipe e/ou administrador conforme regra futura |

### 10.4 Regras e cuidados

- Cada usuário deve possuir preferências de e-mail e notificações, dentro dos eventos obrigatórios definidos pela administração.
- Evitar duplicidade e tempestades de notificações.
- E-mails devem conter apenas dados mínimos (protocolo, tipo de evento, departamento se permitido e link). **Não incluir dados sensíveis do formulário ou notas internas no corpo do e-mail.**
- A aplicação precisa registrar estado do aviso: gerado, pendente, enviado, falhou, reprocessado quando aplicável.
- Falha no envio de e-mail não pode apagar nem desfazer um chamado já criado.
- Em testes, evitar envios para pessoas reais; utilizar endereços e destinos de teste autorizados.
- Notificações globais do administrador supremo devem ser **configuráveis**, para não gerar mensagens excessivas de todas as áreas.
- Quando o serviço externo de e-mails ainda não estiver configurado, sinalizar claramente a indisponibilidade e manter os eventos necessários para posterior integração; **não afirmar que o e-mail foi enviado**.

---

## 11. Administração do catálogo e das equipes

### 11.1 Departamentos/caixas

O `super_admin` pode:

- Criar, editar, ordenar, ativar, ocultar e arquivar departamentos.
- Configurar nome, descrição, chave/prefixo, ícone e regras básicas de visibilidade.
- Consultar quantos serviços, atendentes e chamados existem na área.
- Adicionar/remover usuários da equipe autorizada.
- Decidir se a caixa fica publicada para todos os usuários corporativos habilitados ou apenas para grupos permitidos.
- Impedir exclusão definitiva de caixa com chamados históricos; usar arquivamento.

### 11.2 Categorias e tipos de solicitação

- Criar categorias em cada departamento.
- Criar tipos de solicitação dentro de uma categoria ou diretamente na caixa.
- Definir nome, resumo, instruções, ordem e formulário associado.
- Publicar/despublicar ou arquivar serviços.
- Não permitir publicar um serviço sem formulário válido e regras de acesso definidas.

### 11.3 Usuários e equipes

- Buscar usuário por nome/e-mail corporativo verificado.
- Exibir papéis e caixas em que participa.
- Conceder/remover acesso de atendimento a caixas específicas.
- Um atendente pode participar de várias caixas.
- Cadastro e permissões são ações separadas: um usuário autenticado não vira automaticamente atendente.
- Não criar contas genéricas compartilhadas para departamentos.
- Manter histórico das mudanças de permissão.

### 11.4 Operações em lote — evolução

- Filtrar e selecionar múltiplos chamados para atribuição/alterações controladas.
- Exigir confirmação, verificar permissões e auditar o resultado de cada operação.
- Não priorizar sobre o fluxo básico de atendimento individual.

---

## 12. Pesquisa, histórico, filtros e relatórios

### 12.1 Busca

- Busca por protocolo, assunto e informações permitidas ao perfil.
- Nenhum resultado deve revelar sequer a existência de chamados não autorizados.
- Ordenação estável e paginação.
- Estados de busca vazia e filtros ativos facilmente identificáveis.

### 12.2 Histórico e auditoria

Registrar eventos como criação, atualização, resposta, nota interna, anexos, mudança de status, prioridade, atribuição/transferência, publicação de formulário, autorização/revogação de atendentes e concessão/revogação administrativa.

Cada registro relevante deve guardar autor, momento, entidade, ação e valores anteriores/novos quando apropriado. O histórico deve ser preservado mesmo se um usuário perder acesso ou um serviço for arquivado.

Separar:

- **Linha do tempo pública:** o que o solicitante pode ver.
- **Linha do tempo interna:** atividades da equipe e notas internas.
- **Auditoria administrativa:** eventos de configuração e segurança.

### 12.3 Indicadores mínimos do painel

- Total de chamados abertos.
- Chamados por status, área e prioridade.
- Chamados não atribuídos.
- Chamados atribuídos a cada atendente (com permissão apropriada).
- Chamados criados e concluídos por período.
- Tempo médio até primeira resposta e resolução **quando houver dados suficientes e critérios definidos**.

Não exibir números fictícios ou métricas de SLA inventadas. Na ausência de dados, exibir `0`, `Sem dados` ou `Ainda não configurado` conforme o caso.

### 12.4 Evoluções de gestão

- Relatórios exportáveis com controles de acesso.
- SLAs por departamento, tipo e prioridade; calendário de atendimento, horário comercial, pausas e escalonamento, **apenas após validar as regras da MTP**.
- Fluxos formais de aprovação (uma ou várias pessoas, ordem, condições e registro das decisões), conforme tipos de solicitações que realmente necessitarem.
- Base de conhecimento, pesquisa de satisfação e integrações adicionais, após validação.

---

## 13. Identidade visual e experiência

### 13.1 Marca

- Usar o **logo branco da MTP disponível dentro de `.docs/` no projeto**.
- Antes de implementar, localizar o arquivo real no diretório `.docs`, identificar seu formato e utilizá-lo sem inventar nome/caminho nem recriar a marca.
- O logo branco deve aparecer sobre fundo escuro com contraste adequado; não colocá-lo diretamente sobre fundo branco.
- Adotar visual moderno, profissional e limpo, coerente com uma empresa de tecnologia.
- Referência cromática institucional a considerar, sujeita a conferência com os ativos fornecidos: azul-escuro `#101246` e azul-claro `#5BB2DD`. Priorizar consistência, contraste e legibilidade; não usar gradientes ou efeitos excessivos.

### 13.2 Linguagem da interface

- Todos os textos em **português do Brasil**.
- Rótulos claros: `Abrir chamado`, `Minhas solicitações`, `Assumir chamado`, `Responder ao solicitante`, `Nota interna`, `Atribuir responsável`, `Concluir chamado`.
- Mensagens de erro úteis, sem linguagem técnica excessiva.
- Não expor termos de implementação, nomes de tabelas ou detalhes do sistema ao usuário final.

### 13.3 Design responsivo e acessibilidade

- Desktop como cenário principal de operação; mobile plenamente utilizável para abrir e acompanhar chamados.
- Navegação por teclado, foco visível, labels em campos, contraste adequado e mensagens de validação próximas aos campos.
- Não comunicar status somente por cor; usar texto/ícone.
- Cabeçalhos claros, breadcrumbs e navegação previsível.
- Modais apenas quando agregarem valor; confirmações para ações destrutivas.
- Telas de carregamento, vazio, falha, permissão insuficiente e sucesso devem ser implementadas.

### 13.4 Páginas mínimas

1. Acesso/autenticação.
2. Página inicial/catálogo.
3. Listagem de departamentos e serviços.
4. Formulário de abertura.
5. Confirmação de protocolo.
6. Minhas solicitações.
7. Detalhe do chamado (visão solicitante).
8. Painel de atendimento (lista e Kanban).
9. Detalhe do chamado (visão atendente/admin).
10. Administração de departamentos.
11. Administração de categorias e serviços.
12. Construtor e prévia de formulários.
13. Administração de usuários e acessos por caixa.
14. Notificações.
15. Perfil e configurações pessoais.
16. Visão geral e auditoria do super admin.

---

## 14. Modelo conceitual de informações (independente de fornecedor)

O projeto deve ser organizado de maneira que outra equipe consiga entender e manter a persistência dos dados. Os nomes abaixo são conceituais e podem ser adaptados, desde que os relacionamentos e controles sejam preservados.

| Entidade | Finalidade | Relações essenciais |
|---|---|---|
| `users` | Identidades individuais verificadas, nome, e-mail, status | Pode integrar equipes, abrir e atender chamados |
| `roles` / `user_roles` | Papéis globais autorizados | `super_admin` não decorre do e-mail digitado |
| `departments` | Caixas de atendimento | Contêm categorias, serviços, equipe e chamados |
| `department_members` | Vínculo de usuários atendentes a cada caixa | Usuário + departamento + situação/permissões |
| `service_categories` | Grupos opcionais do catálogo | Pertencem a departamento |
| `service_types` | Tipos de solicitação | Pertencem a departamento/categoria, apontam a formulário |
| `form_definitions` | Identidade e estado editorial de um formulário | Possui versões |
| `form_versions` | Estrutura publicada/rascunho versionada | Referenciada pelo chamado criado |
| `form_fields` / esquema | Campos, regras e ordem por versão | Respostas devem preservar sua origem |
| `tickets` | Registro único de cada solicitação | Solicitante, caixa, serviço, versão, status, prioridade e responsável |
| `ticket_answers` | Respostas estruturadas do formulário | Chamado + campo/versão correspondente |
| `ticket_messages` | Respostas públicas e notas internas | Chamado + autor + visibilidade |
| `ticket_attachments` | Metadados e autorização dos arquivos | Chamado e, se aplicável, mensagem/campo |
| `ticket_events` | Histórico e trilha de auditoria | Chamado + ação + autor + momento |
| `notifications` | Avisos pessoais e estado de leitura | Destinatário + evento + chamado |
| `notification_deliveries` | Estado de envio por canal | Notificação, canal, tentativa e resultado |
| `audit_logs` | Ações administrativas e de segurança | Autor + entidade + alteração + momento |
| `user_preferences` | Preferências pessoais de notificação | Usuário e canais habilitados |

Regras de consistência:

- Um chamado possui um único registro principal; as visões são consultas filtradas.
- Toda referência a usuário, departamento, serviço e versão de formulário precisa ser válida.
- Remover/arquivar um serviço nunca deve invalidar chamados históricos.
- Definir política de retenção e eventual anonimização depois, com a MTP; **não apagar automaticamente histórico por conveniência**.
- Datas com referência temporal consistente; exibir no fuso do usuário/organização.
- Indexar pesquisas e filas por campos relevantes sem expor conteúdo protegido.
- Proteger anexos por autorização, não por URLs públicas permanentes.
- Evoluções de estrutura de dados devem ser documentadas, reproduzíveis e revisáveis.

---

## 15. Requisitos de segurança e confiabilidade

1. **Autenticação individual** com identidade e domínio corporativo efetivamente verificados. Uma string `@mtp.com.br` inserida no formulário não é prova de identidade.
2. **Autorização no servidor** em todas as leituras, listagens, downloads e mutações.
3. **Menor privilégio:** solicitantes veem dados próprios; atendentes apenas suas caixas; super admins acessam o conjunto necessário à administração.
4. **Credenciais administrativas nunca compartilhadas.**
5. **Não conceder `super_admin` por e-mail escrito no cliente.** Bootstrap e mudanças de privilégios devem ser privilegiados e auditados.
6. **Proteção de anexos:** tipos e tamanhos permitidos, verificação de conteúdo, nomes normalizados, acesso autenticado e tratamento seguro de arquivos.
7. **Validação dos dados de entrada** e proteção contra injeção, XSS e operações não autorizadas.
8. **Segregação de mensagens internas** também nas consultas e notificações.
9. **Integridade concorrente:** criação de protocolos, atribuição voluntária e mudanças de status precisam resistir a operações simultâneas.
10. **Trilha de auditoria:** sem exclusões silenciosas de histórico sensível.
11. **Tratamento de erros:** falhas devem ser registráveis de forma segura; não mostrar segredos ou rastros internos ao usuário.
12. **Resiliência:** uma falha de e-mail não deve comprometer a abertura do chamado.
13. **Backup, restauração e observabilidade:** preparar orientação para a futura equipe responsável por operação, segurança e banco.
14. **Ambiente de testes:** somente informações fictícias, sem dados reais de clientes, colaboradores ou produção.
15. **Revisão de segurança antes de produção:** exigida; protótipo funcional não implica aprovação para dados corporativos reais.

---

## 16. Requisitos de qualidade, código e manutenção

- Componentes e módulos com responsabilidade clara, separando apresentação, regras do domínio, acesso a dados e serviços.
- Tipos/contratos consistentes para entidades, formulários, eventos, permissões e estados.
- Convenções de nomes e estrutura de pastas documentadas.
- Sem senhas, segredos ou tokens embutidos no repositório.
- Evitar duplicação de regra de autorização entre telas; centralizar políticas.
- Sem dependência de arrays fictícios para simular persistência final.
- Não tratar armazenamento local do navegador como banco definitivo de chamados.
- Falhas de carregamento, sessão expirada, acesso negado e ações simultâneas devem ter tratamento explícito.
- Preparar documentação curta para instalação, execução, configuração inicial, testes, papéis e manutenção futura.
- Para recursos ainda indisponíveis, mostrar estado verdadeiro de indisponibilidade; **não incluir botões que não façam nada**.
- Não trocar funcionalidades obrigatórias por dados estáticos ou alertas falsos de sucesso.
- Evitar dependências desnecessárias, abstrações prematuras e funcionalidades fora do escopo.

---

## 17. Marcos de implementação e prioridades

O `spec.md` descreve o produto completo, mas **o desenvolvimento deve ser incremental**. Não gerar todos os módulos de uma vez sem validação.

### Marco 0 — Preparação do projeto

**Objetivo:** aplicação inicia localmente sem erro e está pronta para receber módulos reais.

- Estrutura organizada, identidade visual e logo real de `.docs/`.
- Layout principal, navegação por papéis e páginas de estados vazios.
- Configurações necessárias documentadas, sem segredos no código.
- Rotina controlada para estabelecer o super admin inicial após identidade verificada.
- Nenhum departamento pré-criado.

**Critério de aceite:** a aplicação inicia, navega e não apresenta dados fictícios como reais; o acesso admin não depende de truque visual.

### Marco 1 — Administração do catálogo e formulários

**Objetivo:** a administradora consegue montar a central do zero sem programar.

- Criar/editar/arquivar departamentos.
- Criar categorias e tipos de solicitação.
- Criar, pré-visualizar e publicar formulários com campos básicos.
- Configurar visibilidade e ordem do catálogo.
- Consultar catálogo publicado como solicitante.

**Critério de aceite:** iniciar com zero caixas, criar uma caixa manualmente, cadastrar um serviço e publicar um formulário; este passa a aparecer para usuários autorizados.

### Marco 2 — Chamados funcionais de ponta a ponta

**Objetivo:** abrir, armazenar, consultar e tratar um chamado real de teste.

- Autenticação individual e controles de acesso.
- Abertura de chamado com persistência e protocolo único.
- Minhas solicitações e detalhe com respostas públicas.
- Caixa de atendimento para membros autorizados.
- Resposta pública, nota interna, status e histórico.
- Adicionar/remover atendentes de caixas.
- Assumir chamado livre e designar/transferir pelo super admin.
- Conclusão e consulta posterior.

**Critério de aceite:** usando contas distintas de teste, um solicitante abre, um atendente da área responde e conclui, e ambos visualizam apenas o que suas permissões permitem.

### Marco 3 — Notificações e qualidade operacional

**Objetivo:** eliminar a dependência de verificações manuais constantes.

- Central de notificações com contador e leitura.
- Eventos de criação, atribuição, resposta e conclusão.
- Envio de e-mail de teste quando o canal estiver configurado, com registro de falhas e sem vazamento de dados.
- Filtros, pesquisa, listas, Kanban e indicadores básicos.
- Testes de concorrência, permissões, anexos e responsividade.

**Critério de aceite:** novo chamado é mostrado à equipe autorizada; avisos são gerados corretamente e e-mails são entregues quando o canal está habilitado e testado.

### Marco 4 — Evoluções após homologação

- Regras condicionais mais sofisticadas de formulários.
- SLAs configuráveis e alertas de vencimento.
- Aprovações com responsáveis e etapas.
- Relatórios avançados e exportação.
- Base de conhecimento e integrações institucionais.
- Migração assistida de dados legados **somente se solicitada e autorizada**.

**Critério de aceite:** cada evolução possui requisito próprio, teste, controle de acesso e aprovação de uso antes de entrar em produção.

---

## 18. Cenários de aceite obrigatórios

### 18.1 Acesso e papéis

- [ ] Uma conta corporativa individual verificada entra no sistema como solicitante.
- [ ] Um usuário não consegue se tornar admin mudando e-mail no navegador ou parâmetros de chamada.
- [ ] `emilly.almeida@mtp.com.br` recebe privilégio inicial somente pelo procedimento controlado previsto.
- [ ] Um atendente abre chamado como solicitante sem trocar de conta.
- [ ] Um atendente de área A não acessa a fila/nota interna de área B sem permissão.
- [ ] O super admin visualiza as caixas e configura seus membros.
- [ ] Uma permissão revogada deixa de valer sem exigir nova instalação da aplicação.
- [ ] O super admin definitivo pode ser nomeado e o inicial removido sem perda de acesso administrativo.

### 18.2 Catálogo e formulários

- [ ] Primeira execução mostra zero caixas, sem conteúdo pré-cadastrado.
- [ ] Admin cria departamento, categoria, serviço e formulário exclusivamente na interface.
- [ ] Campos obrigatórios e opcionais funcionam e são validados também no servidor.
- [ ] Um formulário ainda em rascunho não pode ser usado para abertura pública.
- [ ] A publicação torna o serviço visível somente ao público autorizado.
- [ ] Alterar o formulário não altera respostas históricas.
- [ ] Serviço com chamados antigos pode ser arquivado sem perda de histórico.

### 18.3 Atendimento

- [ ] Solicitante abre chamado e recebe protocolo único.
- [ ] O chamado aparece na fila correta sem duplicação física.
- [ ] Atendente autorizado responde mesmo sem atribuição prévia.
- [ ] Um atendente assume chamado não atribuído.
- [ ] Duas tentativas simultâneas de assumir não geram dois responsáveis.
- [ ] Super admin designa ou transfere para atendente da caixa.
- [ ] Atendente não atribui para área/usuário que não administra.
- [ ] Nota interna não aparece para o solicitante em nenhuma tela ou consulta.
- [ ] Solicitante responde publicamente e o histórico fica preservado.
- [ ] Responsável autorizado conclui, e o solicitante acompanha a conclusão.
- [ ] Retirada de atendente não abandona chamados atribuídos silenciosamente.

### 18.4 Notificações e qualidade

- [ ] Novo chamado gera notificação em tela para a equipe configurada.
- [ ] Atribuição gera notificação para o novo responsável.
- [ ] Respostas públicas notificam os destinatários certos.
- [ ] Notas internas nunca são enviadas ao solicitante.
- [ ] Falha de envio de e-mail não apaga o chamado.
- [ ] Interfaces desktop e mobile são utilizáveis.
- [ ] Filtros e busca não expõem chamados não autorizados.
- [ ] Todas as ações oferecidas funcionam ou estão honestamente sinalizadas como indisponíveis.
- [ ] Testes são executados com dados fictícios; nenhum dado real é necessário para demonstrar o fluxo.

---

## 19. Exemplo de demonstração de ponta a ponta (com dados fictícios)

> Este roteiro orienta os testes. **Não pré-popular o sistema com ele.**

1. A administradora inicial entra na plataforma vazia.
2. Cria manualmente uma caixa fictícia chamada `Departamento Teste`.
3. Cria a categoria fictícia `Solicitações Gerais`.
4. Cria um formulário com `Resumo` (obrigatório), `Descrição` (obrigatório) e `Anexo` (opcional).
5. Publica um serviço de teste na caixa.
6. Autoriza duas identidades de teste individuais como atendentes da caixa.
7. Um terceiro usuário fictício autentica e abre um chamado.
8. Os dois atendentes o visualizam na mesma fila e recebem notificação configurada.
9. O primeiro atendente responde publicamente **sem precisar assumir**.
10. O segundo atendente assume o chamado e aparece como responsável principal.
11. A administradora consegue redistribuir a responsabilidade para o primeiro atendente.
12. O responsável registra nota interna, envia resposta pública e marca como resolvido/fechado.
13. O solicitante vê apenas as respostas públicas e o status, nunca as notas internas.
14. A equipe e a administração conseguem consultar histórico e indicadores sem perder autoria.

---

## 20. Restrições, decisões pendentes e regras de não invenção

### 20.1 Definições já tomadas

- Uso exclusivo por identidades individuais corporativas habilitadas da MTP.
- Três papéis: solicitante, atendente por caixa e super admin global.
- A administradora inicial de teste será `emilly.almeida@mtp.com.br`.
- O sistema começa **sem departamentos e sem formulários**; o catálogo será montado pela administração.
- Atendentes da mesma caixa podem responder sem esperar uma designação.
- Existe um responsável principal opcional, que pode assumir voluntariamente quando o chamado está livre.
- O super admin pode designar e transferir chamados, e gerir quem atende cada caixa.
- Notificações proativas são requisito importante, pois verificações manuais são uma dor atual.
- Logo branco da MTP disponível em `.docs/` deve ser utilizado.

### 20.2 Decisões a validar com as áreas/TI antes de uso real

- Forma institucional definitiva de autenticação e ciclo de vida das contas.
- Quem será o administrador supremo definitivo e qual o procedimento de contingência.
- Se existem departamentos que exigem restrição adicional de leitura entre os próprios atendentes.
- Fluxos de aprovação e formulários concretos de cada departamento.
- Regras de SLA: horários, metas, pausas, escalonamentos e feriados.
- Política institucional de notificações, destinatários e retenção.
- Política de anexos, retenção e descarte de dados.
- Hospedagem, operação, backup, responsáveis técnicos e aprovação de segurança antes da implantação.
- Se haverá importação de chamados históricos da ferramenta anterior.

### 20.3 Não fazer sem autorização

- Não cadastrar automaticamente os 9 portais ou 13 espaços observados no Jira.
- Não criar usuários reais, histórico real, senhas comuns nem dados corporativos de produção.
- Não prometer envio de e-mail sem canal realmente habilitado e testado.
- Não presumir que todos os departamentos têm a mesma regra de aprovação ou SLA.
- Não liberar acesso entre departamentos apenas por conveniência.
- Não entregar um protótipo de telas afirmando que o gerenciamento completo de chamados está funcional.
- Não iniciar migração ou desativação do Jira neste estágio.

---

## 21. Diretriz final para execução

Construir **uma Central de Serviços MTP funcional, segura por desenho, com catálogo inicialmente vazio e totalmente administrável**, respeitando papéis e escopo por departamento. O produto deve permitir que o administrador crie a estrutura, conceda acesso a atendentes, receba chamados, acompanhe uma fila compartilhada, atribua responsabilidades e conclua solicitações com histórico e notificações.

Priorizar **entregas pequenas, verificáveis e executáveis**. Antes de cada marco, conferir se as funções entregues funcionam de verdade, se dados persistem corretamente, se permissões são aplicadas no servidor e se não foram adicionadas áreas ou regras fictícias sem solicitação.

O desenvolvimento inicial é **exclusivamente para teste com dados fictícios**. A implantação corporativa exigirá validações próprias de identidade, segurança, operação e governança.

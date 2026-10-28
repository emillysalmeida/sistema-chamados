import React, { useState, useEffect } from 'react';
import { UserProfile, DepartmentMember, Ticket } from './types/database';
import { authService, INITIAL_SUPER_ADMIN_EMAIL } from './services/authService';
import { ticketService } from './services/ticketService';
import { notificationService } from './services/notificationService';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { ServiceCatalogView } from './components/catalog/ServiceCatalogView';
import { TicketList } from './components/tickets/TicketList';
import { TicketKanban } from './components/tickets/TicketKanban';
import { TicketDetail } from './components/tickets/TicketDetail';
import { TicketCreateModal } from './components/tickets/TicketCreateModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { DepartmentManager } from './components/admin/DepartmentManager';
import { CategoryManager } from './components/admin/CategoryManager';
import { FormsManagerView } from './components/admin/FormsManagerView';
import { UserManager } from './components/admin/UserManager';
import { AuditViewer } from './components/admin/AuditViewer';
import { GlobalDashboard } from './components/admin/GlobalDashboard';
import { AuthScreen } from './components/auth/AuthScreen';
import { RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  // Current logged in user (starts from Supabase session)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userDepartments, setUserDepartments] = useState<DepartmentMember[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalogo');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Modals & Drawers
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  // Tickets cache
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Initial session verification
  useEffect(() => {
    initAuthSession();
  }, []);

  const initAuthSession = async () => {
    try {
      setIsInitializing(true);
      const { user } = await authService.getCurrentSession();
      if (user) {
        setCurrentUser(user);
        await refreshUserData(user);
        const users = await authService.getAllUsers();
        setAllUsers(users);
      }
    } catch (err) {
      console.error('Erro ao verificar sessão Supabase:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const refreshUserData = async (user: UserProfile) => {
    const depts = await authService.getUserDepartments(user.id);
    setUserDepartments(depts);

    const notifs = await notificationService.getUserNotifications(user.id);
    const unread = notifs.filter((n) => !n.is_read).length;
    setUnreadNotificationsCount(unread);
  };

  // Sign out handler
  const handleSignOut = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setSelectedTicketId(null);
    setActiveTab('catalogo');
  };

  // Switch test user account
  const handleSwitchUser = async (email: string, name: string) => {
    const user = await authService.syncUserProfile(`manual_${Date.now()}`, email, name);
    setCurrentUser(user);
    const users = await authService.getAllUsers();
    setAllUsers(users);
    await refreshUserData(user);
    setSelectedTicketId(null);
    setActiveTab('catalogo');
  };

  // Fetch tickets whenever activeTab or currentUser changes
  useEffect(() => {
    if (currentUser && !selectedTicketId) {
      loadTicketsForCurrentView();
    }
  }, [activeTab, currentUser, selectedTicketId]);

  const loadTicketsForCurrentView = async () => {
    if (!currentUser) return;
    try {
      setLoadingTickets(true);
      let view: 'minhas_solicitacoes' | 'minha_area' | 'nao_atribuidos' | 'atribuidos_a_mim' | 'todos_global' =
        'minhas_solicitacoes';

      if (activeTab === 'minhas_solicitacoes') view = 'minhas_solicitacoes';
      else if (activeTab === 'atendimento_area' || activeTab === 'atendimento_kanban') view = 'minha_area';
      else if (activeTab === 'atendimento_nao_atribuidos') view = 'nao_atribuidos';
      else if (activeTab === 'atendimento_meus') view = 'atribuidos_a_mim';
      else if (activeTab === 'admin_tickets') view = 'todos_global';

      const data = await ticketService.getTickets({
        view,
        currentUser,
      });
      setTickets(data);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Loading initial session
  if (isInitializing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--mtp-navy-deep)',
          color: '#ffffff',
          fontFamily: 'var(--font-family)',
        }}
      >
        <img src="/Logo-MTP-BRANCO.png" alt="MTP" style={{ height: 40, marginBottom: 20 }} />
        <RefreshCw size={24} className="animate-spin" color="var(--mtp-blue-primary)" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>Inicializando Central de Serviços MTP...</div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>Conectando ao Supabase Auth...</div>
      </div>
    );
  }

  // Not authenticated: render Supabase Login / Signup / Reset screen
  if (!currentUser) {
    return (
      <AuthScreen
        onAuthenticated={async (user) => {
          setCurrentUser(user);
          await refreshUserData(user);
          const users = await authService.getAllUsers();
          setAllUsers(users);
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        userDepartments={userDepartments}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setShowNotificationDrawer(true)}
        onOpenNewTicket={() => setShowCreateTicketModal(true)}
        onSwitchUser={handleSwitchUser}
        allUsers={allUsers}
        onSignOut={handleSignOut}
      />

      {/* Main Layout Area */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Dynamic Sidebar */}
        <Sidebar
          currentUser={currentUser}
          userDepartments={userDepartments}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setSelectedTicketId(null);
          }}
          openTicketsCount={tickets.filter((t) => t.status === 'aberto').length}
        />

        {/* Content View */}
        <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', background: 'var(--bg-main)' }}>
          {selectedTicketId ? (
            /* Ticket Detail View */
            <TicketDetail
              ticketId={selectedTicketId}
              currentUser={currentUser}
              onBack={() => setSelectedTicketId(null)}
              onTicketUpdated={() => {
                loadTicketsForCurrentView();
                if (currentUser) refreshUserData(currentUser);
              }}
            />
          ) : (
            /* Active View Router */
            (() => {
              switch (activeTab) {
                case 'catalogo':
                  return (
                    <ServiceCatalogView
                      currentUser={currentUser}
                      onOpenCreateTicket={() => setShowCreateTicketModal(true)}
                    />
                  );

                case 'minhas_solicitacoes':
                  return (
                    <TicketList
                      tickets={tickets}
                      onSelectTicket={(t) => setSelectedTicketId(t.id)}
                      title="Minhas Solicitações"
                      subtitle="Acompanhe o andamento e as respostas públicas dos seus chamados abertos"
                      emptyTitle="Você ainda não possui solicitações"
                      emptyDescription="Abra seu primeiro chamado através do catálogo de serviços para que ele seja atendido."
                      onOpenCreate={() => setShowCreateTicketModal(true)}
                    />
                  );

                case 'atendimento_area':
                  return (
                    <TicketList
                      tickets={tickets}
                      onSelectTicket={(t) => setSelectedTicketId(t.id)}
                      title="Fila de Atendimento do Departamento"
                      subtitle="Fila coletiva compartilhada por todos os atendentes autorizados desta caixa (Spec 9.1)"
                      emptyTitle="Fila vazia"
                      emptyDescription="Nenhum chamado aberto na fila deste departamento no momento."
                    />
                  );

                case 'atendimento_nao_atribuidos':
                  return (
                    <TicketList
                      tickets={tickets}
                      onSelectTicket={(t) => setSelectedTicketId(t.id)}
                      title="Chamados Não Atribuídos"
                      subtitle="Solicitações aguardando um responsável principal para assumir o atendimento voluntariamente (Spec 9.2)"
                      emptyTitle="Nenhum chamado sem responsável"
                      emptyDescription="Todos os chamados da área já possuem um atendente designado ou foram concluídos."
                    />
                  );

                case 'atendimento_meus':
                  return (
                    <TicketList
                      tickets={tickets}
                      onSelectTicket={(t) => setSelectedTicketId(t.id)}
                      title="Atribuídos a Mim"
                      subtitle="Chamados em que você é o atendente responsável principal (Spec 9.1)"
                      emptyTitle="Nenhum chamado atribuído a você"
                      emptyDescription="Você não é o responsável principal por nenhum chamado pendente no momento. Assuma chamados na fila de não atribuídos."
                    />
                  );

                case 'atendimento_kanban':
                  return (
                    <TicketKanban
                      tickets={tickets}
                      onSelectTicket={(t) => setSelectedTicketId(t.id)}
                    />
                  );

                case 'admin_overview':
                  return <GlobalDashboard />;

                case 'admin_departments':
                  return <DepartmentManager currentUser={currentUser} />;

                case 'admin_services':
                  return <CategoryManager currentUser={currentUser} />;

                case 'admin_forms':
                  return <FormsManagerView currentUser={currentUser} />;

                case 'admin_users':
                  return (
                    <UserManager
                      currentUser={currentUser}
                      onRefreshCurrentUser={() => refreshUserData(currentUser)}
                    />
                  );

                case 'admin_tickets':
                  return (
                    <TicketList
                      tickets={tickets}
                      onSelectTicket={(t) => setSelectedTicketId(t.id)}
                      title="Chamados Globais (Visão de Administração)"
                      subtitle="Visualização irrestrita de todas as caixas, solicitações e responsáveis da MTP"
                      emptyTitle="Nenhum chamado no sistema"
                      emptyDescription="O sistema inicia com 0 chamados registrados (Spec 3.1)."
                    />
                  );

                case 'admin_audit':
                  return <AuditViewer />;

                default:
                  return null;
              }
            })()
          )}
        </main>
      </div>

      {/* Ticket Create Modal */}
      {showCreateTicketModal && (
        <TicketCreateModal
          isOpen={showCreateTicketModal}
          onClose={() => setShowCreateTicketModal(false)}
          currentUser={currentUser}
          onTicketCreated={(ticket) => {
            loadTicketsForCurrentView();
            if (currentUser) refreshUserData(currentUser);
          }}
        />
      )}

      {/* In-App Notifications Drawer */}
      {showNotificationDrawer && (
        <NotificationDrawer
          isOpen={showNotificationDrawer}
          onClose={() => setShowNotificationDrawer(false)}
          currentUser={currentUser}
          onRefreshUnread={() => {
            if (currentUser) refreshUserData(currentUser);
          }}
        />
      )}
    </div>
  );
};
export default App;

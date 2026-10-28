import React from 'react';
import { UserProfile, DepartmentMember } from '../../types/database';
import {
  Home,
  FileText,
  Inbox,
  CheckCircle2,
  Users,
  FolderKanban,
  Settings,
  ShieldAlert,
  BarChart3,
  Layers,
  Kanban,
  ClipboardList,
  UsersRound,
} from 'lucide-react';

export type ActiveTab =
  | 'catalogo'
  | 'minhas_solicitacoes'
  | 'atendimento_area'
  | 'atendimento_nao_atribuidos'
  | 'atendimento_meus'
  | 'atendimento_kanban'
  | 'admin_overview'
  | 'admin_departments'
  | 'admin_services'
  | 'admin_forms'
  | 'admin_users'
  | 'admin_teams'
  | 'admin_tickets'
  | 'admin_audit';

interface SidebarProps {
  currentUser: UserProfile;
  userDepartments: DepartmentMember[];
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  openTicketsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  userDepartments,
  activeTab,
  onSelectTab,
  openTicketsCount = 0,
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';
  // Atendente: papel explícito OU vinculado a pelo menos um departamento
  const isAttendant = currentUser.role === 'atendente' || currentUser.role === 'super_admin' || userDepartments.length > 0;

  const NavItem = ({
    tab,
    icon: Icon,
    label,
    badge,
  }: {
    tab: ActiveTab;
    icon: any;
    label: string;
    badge?: number;
  }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => onSelectTab(tab)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 12px',
          borderRadius: 'var(--radius-md)',
          background: isActive ? 'var(--mtp-navy-primary)' : 'transparent',
          color: isActive ? '#ffffff' : 'var(--text-secondary)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-family)',
          fontSize: '0.85rem',
          fontWeight: isActive ? 600 : 500,
          marginBottom: 3,
          transition: 'all 0.15s ease',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'var(--bg-card-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon size={18} color={isActive ? 'var(--mtp-blue-primary)' : 'currentColor'} />
          <span>{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span
            className="badge"
            style={{
              background: isActive ? 'var(--mtp-blue-primary)' : 'var(--border-light)',
              color: isActive ? 'var(--mtp-navy-deep)' : 'var(--text-secondary)',
              fontSize: '0.675rem',
              fontWeight: 700,
              padding: '2px 6px',
            }}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      style={{
        width: 260,
        backgroundColor: '#ffffff',
        borderRight: '1px solid var(--border-light)',
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        overflowY: 'auto',
      }}
    >
      {/* Solicitante Section */}
      <div>
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: 8,
            paddingLeft: 8,
          }}
        >
          Portal do Solicitante
        </div>
        <NavItem tab="catalogo" icon={Home} label="Início / Catálogo" />
        <NavItem tab="minhas_solicitacoes" icon={FileText} label="Minhas Solicitações" />
      </div>

      {/* Atendente Section (Only visible if user is member of at least one department or super_admin) */}
      {(isAttendant || isSuperAdmin) && (
        <div>
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              marginBottom: 8,
              paddingLeft: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Central de Atendimento</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--mtp-blue-primary)', fontWeight: 700 }}>
              {isSuperAdmin ? 'Todas as Áreas' : `${userDepartments.length} Caixa(s)`}
            </span>
          </div>
          <NavItem tab="atendimento_area" icon={Inbox} label="Fila do Departamento" badge={openTicketsCount} />
          <NavItem tab="atendimento_nao_atribuidos" icon={ClipboardList} label="Não Atribuídos" />
          <NavItem tab="atendimento_meus" icon={CheckCircle2} label="Atribuídos a Mim" />
          <NavItem tab="atendimento_kanban" icon={Kanban} label="Quadro Kanban" />
        </div>
      )}

      {/* Super Admin Section (Only visible to super_admin) */}
      {isSuperAdmin && (
        <div>
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              marginBottom: 8,
              paddingLeft: 8,
            }}
          >
            Administração Global
          </div>
          <NavItem tab="admin_overview" icon={BarChart3} label="Visão Geral & Métricas" />
          <NavItem tab="admin_tickets" icon={Layers} label="Chamados Globais" />
          <NavItem tab="admin_departments" icon={FolderKanban} label="Departamentos / Caixas" />
          <NavItem tab="admin_services" icon={Settings} label="Categorias & Serviços" />
          <NavItem tab="admin_forms" icon={FileText} label="Construtor de Formulários" />
          <NavItem tab="admin_users" icon={Users} label="Usuários & Equipes" />
          <NavItem tab="admin_teams" icon={UsersRound} label="Gestão de Equipes" />
          <NavItem tab="admin_audit" icon={ShieldAlert} label="Trilha de Auditoria" />
        </div>
      )}

      <div style={{ marginTop: 'auto', padding: '12px 8px', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          <strong>MTP Central de Serviços</strong>
          <div>Versão Protótipo 1.0</div>
          <div>pt-BR • MTP Brasil</div>
        </div>
      </div>
    </aside>
  );
};

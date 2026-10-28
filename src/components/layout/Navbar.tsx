import React, { useState } from 'react';
import { UserProfile, DepartmentMember } from '../../types/database';
import { Bell, User, ShieldCheck, ChevronDown, PlusCircle, Check, ArrowRightLeft, LogOut } from 'lucide-react';

interface NavbarProps {
  currentUser: UserProfile;
  userDepartments: DepartmentMember[];
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onOpenNewTicket: () => void;
  onSwitchUser: (email: string, name: string) => void;
  allUsers: UserProfile[];
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  userDepartments,
  unreadNotificationsCount,
  onOpenNotifications,
  onOpenNewTicket,
  onSwitchUser,
  allUsers,
  onSignOut,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');

  const isSuperAdmin = currentUser.role === 'super_admin';
  const isAttendant = userDepartments.length > 0;

  const handleCreateOrSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.includes('@mtp.com.br')) {
      alert('Por favor informe um e-mail corporativo válido com o domínio @mtp.com.br (Spec 4.1)');
      return;
    }
    onSwitchUser(newEmail, newName || newEmail.split('@')[0]);
    setShowSwitchModal(false);
    setShowUserDropdown(false);
    setNewEmail('');
    setNewName('');
  };

  return (
    <>
      <header
        style={{
          height: 68,
          backgroundColor: 'var(--mtp-navy-primary)',
          borderBottom: '1px solid var(--mtp-navy-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          color: '#ffffff',
          boxShadow: '0 2px 8px rgba(11, 13, 44, 0.25)',
        }}
      >
        {/* Left: Brand logo on dark background */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
            }}
          >
            <img
              src="/Logo-MTP-BRANCO.png"
              alt="MTP"
              style={{ height: 28, objectFit: 'contain' }}
              onError={(e) => {
                // Fallback text if logo fails to load
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div style={{ height: 20, width: 1, background: 'rgba(255, 255, 255, 0.2)' }} />
            <span
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: '#ffffff',
              }}
            >
              Central de Serviços
            </span>
          </div>

          {/* Role Indicator Badge */}
          {isSuperAdmin ? (
            <span
              className="badge"
              style={{
                background: 'rgba(91, 178, 221, 0.2)',
                color: 'var(--mtp-blue-primary)',
                border: '1px solid rgba(91, 178, 221, 0.4)',
                padding: '4px 10px',
              }}
            >
              <ShieldCheck size={14} />
              Super Admin
            </span>
          ) : isAttendant ? (
            <span
              className="badge"
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '4px 10px',
              }}
            >
              Atendente ({userDepartments.length} área{userDepartments.length > 1 ? 's' : ''})
            </span>
          ) : (
            <span
              className="badge"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '4px 10px',
              }}
            >
              Solicitante
            </span>
          )}
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Quick Open Ticket */}
          <button
            className="btn btn-accent btn-sm"
            onClick={onOpenNewTicket}
            style={{ boxShadow: '0 2px 8px var(--mtp-blue-glow)' }}
          >
            <PlusCircle size={16} />
            Abrir Chamado
          </button>

          {/* Notifications Bell */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={onOpenNotifications}
            style={{
              position: 'relative',
              color: '#ffffff',
              padding: 8,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.08)',
            }}
            title="Notificações"
          >
            <Bell size={18} />
            {unreadNotificationsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--mtp-navy-primary)',
                }}
              >
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User Profile / Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--mtp-blue-primary)',
                  color: 'var(--mtp-navy-deep)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>{currentUser.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{currentUser.email}</div>
              </div>
              <ChevronDown size={14} color="#94a3b8" />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: 280,
                  background: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-xl)',
                  border: '1px solid var(--border-light)',
                  padding: 8,
                  zIndex: 200,
                  color: 'var(--text-primary)',
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)', marginBottom: 6 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{currentUser.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentUser.email}</div>
                  <div style={{ marginTop: 4 }}>
                    <span className="badge badge-open" style={{ fontSize: '0.7rem' }}>
                      {currentUser.role === 'super_admin' ? 'Super Admin' : 'Colaborador MTP'}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', padding: '6px 12px' }}>
                  ALTERAR CONTA DE TESTE
                </div>

                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u.email, u.name);
                        setShowUserDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: u.id === currentUser.id ? 'var(--mtp-blue-light)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'var(--font-family)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                      {u.id === currentUser.id && <Check size={16} color="var(--mtp-blue-primary)" />}
                    </button>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 6, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowSwitchModal(true);
                    }}
                  >
                    <ArrowRightLeft size={14} />
                    Entrar com outra conta @mtp.com.br
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', justifyContent: 'center', color: '#dc2626' }}
                    onClick={() => {
                      setShowUserDropdown(false);
                      onSignOut();
                    }}
                  >
                    <LogOut size={14} />
                    Encerrar Sessão
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Switch / New Test Account Modal */}
      {showSwitchModal && (
        <div className="modal-overlay" onClick={() => setShowSwitchModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Autenticar Conta Corporativa MTP</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Insira ou escolha uma identidade individual corporativa (@mtp.com.br).
              </p>
            </div>
            <form onSubmit={handleCreateOrSwitch} style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label className="label label-required">E-mail corporativo</label>
                <input
                  type="email"
                  className="input"
                  placeholder="nome.sobrenome@mtp.com.br"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
                <p className="help-text">Dica: use emilly.almeida@mtp.com.br para bootstrap de Super Admin (Spec 3.2).</p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="label">Nome completo</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nome do Colaborador"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowSwitchModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Confirmar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { UserProfile, TeamMember } from '../../types/database';
import { authService, teamService } from '../../services/authService';
import { Modal } from '../layout/Modal';
import {
  ShieldCheck,
  User,
  Users,
  Headphones,
  ArrowRightLeft,
  UsersRound,
} from 'lucide-react';

interface UserManagerProps {
  currentUser: UserProfile;
  onRefreshCurrentUser: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  solicitante: 'Solicitante',
  atendente: 'Atendente',
  super_admin: 'Super Admin',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  solicitante: 'Abre chamados e acompanha suas próprias solicitações. Sem acesso às filas de atendimento ou administração.',
  atendente: 'Além de abrir chamados, pode visualizar, responder, assumir e concluir chamados nos departamentos em que estiver autorizado.',
  super_admin: 'Acesso administrativo global: gerencia todos os departamentos, usuários, equipes e chamados.',
};

export const UserManager: React.FC<UserManagerProps> = ({ currentUser, onRefreshCurrentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userDeptMap, setUserDeptMap] = useState<Record<string, string[]>>({});
  const [userTeamsMap, setUserTeamsMap] = useState<Record<string, TeamMember[]>>({});
  const [loading, setLoading] = useState(true);

  // Role change state
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<'solicitante' | 'atendente' | 'super_admin'>('solicitante');
  const [submitting, setSubmitting] = useState(false);

  // Expanded user detail
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const list = await authService.getAllUsers();
      setUsers(list);

      const deptMap: Record<string, string[]> = {};
      const teamsMap: Record<string, TeamMember[]> = {};

      await Promise.all(
        list.map(async (u) => {
          const [memberships, userTeams] = await Promise.all([
            authService.getUserDepartments(u.id),
            teamService.getUserTeams(u.id),
          ]);
          deptMap[u.id] = memberships.map((m) => m.department?.name || 'Dept.');
          teamsMap[u.id] = userTeams;
        })
      );

      setUserDeptMap(deptMap);
      setUserTeamsMap(teamsMap);
    } finally {
      setLoading(false);
    }
  };

  const openRoleModal = (u: UserProfile) => {
    setTargetUser(u);
    setNewRole(u.role);
  };

  const handleRoleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    if (newRole === targetUser.role) {
      alert('Nenhuma alteração: o papel selecionado é o mesmo que o atual.');
      return;
    }

    try {
      setSubmitting(true);
      await authService.updateRole(targetUser.id, newRole, currentUser);
      setTargetUser(null);
      await loadUsers();
      onRefreshCurrentUser();
      alert('Papel de acesso atualizado com sucesso.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'super_admin') {
      return (
        <span className="badge" style={{ background: 'rgba(91,178,221,0.2)', color: 'var(--mtp-navy-primary)', border: '1px solid var(--mtp-blue-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ShieldCheck size={11} /> Super Admin
        </span>
      );
    }
    if (role === 'atendente') {
      return (
        <span className="badge badge-in-progress" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Headphones size={11} /> Atendente
        </span>
      );
    }
    return (
      <span className="badge badge-closed" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <User size={11} /> Solicitante
      </span>
    );
  };

  const avatarColor = (role: string) => {
    if (role === 'super_admin') return 'var(--mtp-navy-primary)';
    if (role === 'atendente') return 'var(--mtp-blue-primary)';
    return 'var(--border-light)';
  };
  const avatarTextColor = (role: string) => {
    return role === 'solicitante' ? 'var(--text-primary)' : '#ffffff';
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>
          Gestão de Usuários & Equipes Corporativas
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Gerencie papéis de acesso individuais (@mtp.com.br). Para criar e gerenciar equipes de atendimento, acesse{' '}
          <strong>Gestão de Equipes</strong> no menu lateral.
        </p>
      </div>

      {/* Role legend */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        {(['solicitante', 'atendente', 'super_admin'] as const).map((r) => (
          <div
            key={r}
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              flex: 1,
              minWidth: 180,
            }}
          >
            <div style={{ marginBottom: 6 }}>{getRoleBadge(r)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {ROLE_DESCRIPTIONS[r]}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Carregando usuários...</div>
      ) : (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr
                style={{
                  background: 'var(--bg-main)',
                  borderBottom: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '12px 16px' }}>Colaborador</th>
                <th style={{ padding: '12px 16px' }}>E-mail Corporativo</th>
                <th style={{ padding: '12px 16px' }}>Papel Global</th>
                <th style={{ padding: '12px 16px' }}>Caixas / Equipes</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const depts = userDeptMap[u.id] || [];
                const teams = userTeamsMap[u.id] || [];
                const isExpanded = expandedUserId === u.id;
                const isSelf = u.id === currentUser.id;

                return (
                  <React.Fragment key={u.id}>
                    <tr
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid var(--border-light)',
                        background: isSelf ? 'rgba(91,178,221,0.04)' : 'transparent',
                      }}
                    >
                      {/* Name */}
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              background: avatarColor(u.role),
                              color: avatarTextColor(u.role),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              flexShrink: 0,
                            }}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{u.name}</div>
                            {isSelf && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--mtp-blue-primary)', fontWeight: 500 }}>
                                Você
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {u.email}
                      </td>

                      {/* Role badge */}
                      <td style={{ padding: '12px 16px' }}>{getRoleBadge(u.role)}</td>

                      {/* Depts / Teams summary */}
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {depts.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {depts.slice(0, 3).map((d, i) => (
                              <span key={i} className="badge badge-open" style={{ fontSize: '0.7rem' }}>{d}</span>
                            ))}
                            {depts.length > 3 && (
                              <span className="badge" style={{ fontSize: '0.7rem', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
                                +{depts.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                            Sem departamento
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          {teams.length > 0 && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                              title="Ver equipes vinculadas"
                            >
                              <UsersRound size={13} />
                              {teams.length} equipe(s)
                              {isExpanded ? <span>▲</span> : <span>▼</span>}
                            </button>
                          )}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openRoleModal(u)}
                            title="Alterar papel de acesso"
                          >
                            <ArrowRightLeft size={13} />
                            Papel
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded: teams detail */}
                    {isExpanded && (
                      <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td colSpan={5} style={{ padding: '0 16px 14px 56px', background: 'rgba(91,178,221,0.04)' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Equipes Vinculadas
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {teams.map((tm) => (
                              <div
                                key={tm.id}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid var(--border-light)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '6px 12px',
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <UsersRound size={12} color="var(--mtp-blue-primary)" />
                                <strong>{tm.team?.name}</strong>
                                {tm.team?.department && (
                                  <span style={{ color: 'var(--text-muted)' }}>— {tm.team.department.name}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Change Modal */}
      {targetUser && (
        <Modal
          isOpen={!!targetUser}
          onClose={() => setTargetUser(null)}
          title="Alterar Papel de Acesso"
          subtitle={`Usuário: ${targetUser.name} (${targetUser.email})`}
        >
          <form onSubmit={handleRoleChangeSubmit}>
            {/* Current role */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Papel atual</div>
              {getRoleBadge(targetUser.role)}
            </div>

            {/* New role selector */}
            <div style={{ marginBottom: 14 }}>
              <label className="label label-required">Novo Papel</label>
              <select
                className="select"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
              >
                <option value="solicitante">Solicitante — abre chamados, acompanha solicitações</option>
                <option value="atendente">Atendente — acessa filas dos departamentos autorizados</option>
                <option value="super_admin">Super Admin — acesso administrativo global</option>
              </select>
              {newRole !== targetUser.role && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6, padding: '6px 10px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  {ROLE_DESCRIPTIONS[newRole]}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTargetUser(null)} disabled={submitting}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || newRole === targetUser.role}>
                {submitting ? 'Gravando...' : 'Confirmar Alteração'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

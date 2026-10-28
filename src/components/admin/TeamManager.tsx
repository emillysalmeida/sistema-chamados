import React, { useState, useEffect } from 'react';
import { Team, TeamMember, Department, UserProfile } from '../../types/database';
import { teamService } from '../../services/authService';
import { catalogService } from '../../services/catalogService';
import { authService } from '../../services/authService';
import { Modal } from '../layout/Modal';
import { EmptyState } from '../layout/EmptyState';
import {
  UsersRound,
  Plus,
  Edit2,
  UserPlus,
  UserMinus,
  Archive,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Mail,
  Building2,
  FolderKanban,
} from 'lucide-react';

interface TeamManagerProps {
  currentUser: UserProfile;
}

export const TeamManager: React.FC<TeamManagerProps> = ({ currentUser }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, TeamMember[]>>({});

  // Create / Edit team modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add member modal
  const [addMemberForTeam, setAddMemberForTeam] = useState<Team | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Remove member confirm
  const [removingMember, setRemovingMember] = useState<{ team: Team; member: TeamMember } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsData, deptsData, usersData] = await Promise.all([
        teamService.getTeams(),
        catalogService.getDepartments(false),
        authService.getAllUsers(),
      ]);
      setTeams(teamsData);
      setDepartments(deptsData);
      setAllUsers(usersData);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    const members = await teamService.getTeamMembers(teamId);
    setTeamMembersMap((prev) => ({ ...prev, [teamId]: members }));
  };

  const handleToggleExpand = async (teamId: string) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(teamId);
      if (!teamMembersMap[teamId]) {
        await loadTeamMembers(teamId);
      }
    }
  };

  const openCreateModal = () => {
    setEditingTeam(null);
    setFormName('');
    setFormDescription('');
    setFormEmail('');
    setFormDepartmentId(departments[0]?.id || '');
    setShowTeamModal(true);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormName(team.name);
    setFormDescription(team.description || '');
    setFormEmail(team.team_email || '');
    setFormDepartmentId(team.department_id);
    setShowTeamModal(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDepartmentId) return;

    try {
      setSubmitting(true);
      if (editingTeam) {
        await teamService.updateTeam(
          editingTeam.id,
          { name: formName, description: formDescription, team_email: formEmail },
          currentUser
        );
      } else {
        await teamService.createTeam(
          { name: formName, description: formDescription, team_email: formEmail, department_id: formDepartmentId },
          currentUser
        );
      }
      setShowTeamModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (team: Team) => {
    try {
      await teamService.updateTeam(team.id, { is_active: !team.is_active }, currentUser);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberForTeam || !selectedUserId) return;
    try {
      setAddingMember(true);
      await teamService.addTeamMember(addMemberForTeam.id, selectedUserId, addMemberForTeam, currentUser);
      await loadTeamMembers(addMemberForTeam.id);
      await loadData();
      setSelectedUserId('');
      setAddMemberForTeam(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!removingMember) return;
    try {
      const result = await teamService.removeTeamMember(
        removingMember.team.id,
        removingMember.member.user_id,
        removingMember.team,
        currentUser
      );
      if (result.unassignedTickets > 0) {
        alert(
          `Membro removido. Atenção: ${result.unassignedTickets} chamado(s) atribuído(s) a este atendente foram devolvidos para a fila coletiva do departamento.`
        );
      }
      await loadTeamMembers(removingMember.team.id);
      await loadData();
      setRemovingMember(null);
    } catch (err: any) {
      alert(err.message);
      setRemovingMember(null);
    }
  };

  // Users not yet in the team
  const getAvailableUsers = (team: Team) => {
    const currentMembers = teamMembersMap[team.id] || [];
    const memberIds = new Set(currentMembers.map((m) => m.user_id));
    return allUsers.filter((u) => !memberIds.has(u.id));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--text-muted)' }}>
        Carregando equipes...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--mtp-navy-primary)', marginBottom: 4 }}>
            Gestão de Equipes de Atendimento
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Crie equipes vinculadas a departamentos e gerencie os atendentes autorizados.
            A participação em uma equipe concede acesso operacional à fila do departamento correspondente.
          </p>
        </div>
        {departments.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={openCreateModal} style={{ whiteSpace: 'nowrap' }}>
            <Plus size={15} /> Nova Equipe
          </button>
        )}
      </div>

      {/* Empty state: no departments yet */}
      {departments.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum departamento cadastrado"
          description="Crie ao menos um departamento antes de cadastrar equipes de atendimento."
        />
      )}

      {/* Empty state: departments exist but no teams */}
      {departments.length > 0 && teams.length === 0 && (
        <EmptyState
          icon={UsersRound}
          title="Nenhuma equipe cadastrada"
          description="Crie a primeira equipe de atendimento vinculando-a a um departamento e adicionando os atendentes autorizados."
          actionText="Criar Primeira Equipe"
          onAction={openCreateModal}
        />
      )}

      {/* Team list */}
      {teams.map((team) => {
        const dept = departments.find((d) => d.id === team.department_id);
        const isExpanded = expandedTeamId === team.id;
        const members = teamMembersMap[team.id] || [];

        return (
          <div
            key={team.id}
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 12,
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
              opacity: team.is_active ? 1 : 0.6,
            }}
          >
            {/* Team header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px 20px',
                gap: 14,
                cursor: 'pointer',
              }}
              onClick={() => handleToggleExpand(team.id)}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-md)',
                  background: team.is_active ? 'rgba(16,18,70,0.08)' : 'var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <UsersRound size={18} color={team.is_active ? 'var(--mtp-navy-primary)' : 'var(--text-muted)'} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {team.name}
                  </span>
                  {!team.is_active && (
                    <span className="badge badge-closed" style={{ fontSize: '0.7rem' }}>Inativa</span>
                  )}
                  {team.is_active && (
                    <span className="badge badge-open" style={{ fontSize: '0.7rem' }}>Ativa</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 3, flexWrap: 'wrap' }}>
                  {dept && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building2 size={12} /> {dept.name}
                    </span>
                  )}
                  {team.team_email && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Mail size={12} /> {team.team_email}
                    </span>
                  )}
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {team.member_count} membro(s)
                  </span>
                </div>
                {team.description && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {team.description}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => openEditModal(team)}
                  title="Editar equipe"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleToggleActive(team)}
                  title={team.is_active ? 'Desativar equipe' : 'Reativar equipe'}
                >
                  <Archive size={13} />
                  {team.is_active ? 'Desativar' : 'Reativar'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setAddMemberForTeam(team);
                    setSelectedUserId('');
                    if (!teamMembersMap[team.id]) loadTeamMembers(team.id);
                  }}
                  title="Adicionar membro"
                >
                  <UserPlus size={13} /> Membro
                </button>
              </div>

              <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            {/* Members panel */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid var(--border-light)', padding: '16px 20px' }}>
                {members.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>
                    Nenhum membro nesta equipe ainda. Clique em "Membro" para adicionar atendentes.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {members.map((member) => (
                      <div
                        key={member.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '8px 12px',
                          background: 'var(--bg-main)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: 'var(--mtp-navy-primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            flexShrink: 0,
                          }}
                        >
                          {member.user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            {member.user?.name || 'Usuário desconhecido'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {member.user?.email}
                          </div>
                        </div>
                        <span
                          className={`badge ${member.user?.role === 'super_admin' ? '' : member.user?.role === 'atendente' ? 'badge-in-progress' : 'badge-closed'}`}
                          style={{
                            fontSize: '0.7rem',
                            background: member.user?.role === 'super_admin' ? 'rgba(91,178,221,0.2)' : undefined,
                            color: member.user?.role === 'super_admin' ? 'var(--mtp-navy-primary)' : undefined,
                          }}
                        >
                          {member.user?.role === 'super_admin' ? 'Super Admin' : member.user?.role === 'atendente' ? 'Atendente' : 'Solicitante'}
                        </span>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#dc2626' }}
                          onClick={() => setRemovingMember({ team, member })}
                          title="Remover da equipe"
                        >
                          <UserMinus size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Create / Edit Team Modal */}
      {showTeamModal && (
        <Modal
          isOpen={showTeamModal}
          onClose={() => setShowTeamModal(false)}
          title={editingTeam ? 'Editar Equipe' : 'Nova Equipe de Atendimento'}
          subtitle={editingTeam ? `Editando: ${editingTeam.name}` : 'Preencha os dados da nova equipe'}
        >
          <form onSubmit={handleSaveTeam}>
            <div style={{ marginBottom: 14 }}>
              <label className="label label-required">Nome da Equipe</label>
              <input
                className="input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Suporte Técnico N1, Jurídico, Financeiro..."
                required
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">Descrição (opcional)</label>
              <textarea
                className="textarea"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descreva o escopo de atuação desta equipe..."
                rows={2}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">E-mail de Referência da Equipe (opcional)</label>
              <input
                className="input"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="suporte@mtp.com.br"
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Apenas endereço de referência ou notificação. Não é utilizado para autenticação.
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="label label-required">Departamento / Caixa de Atendimento</label>
              <select
                className="select"
                value={formDepartmentId}
                onChange={(e) => setFormDepartmentId(e.target.value)}
                disabled={!!editingTeam}
                required
              >
                <option value="">Selecione...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
              {editingTeam && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  O departamento não pode ser alterado após a criação.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowTeamModal(false)} disabled={submitting}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? 'Salvando...' : editingTeam ? 'Salvar Alterações' : 'Criar Equipe'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Member Modal */}
      {addMemberForTeam && (
        <Modal
          isOpen={!!addMemberForTeam}
          onClose={() => setAddMemberForTeam(null)}
          title={`Adicionar Membro — ${addMemberForTeam.name}`}
          subtitle="Selecione um colaborador autenticado para adicionar à equipe"
        >
          <form onSubmit={handleAddMember}>
            <div style={{ marginBottom: 14 }}>
              <label className="label label-required">Colaborador</label>
              <select
                className="select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
              >
                <option value="">Selecione um colaborador...</option>
                {getAvailableUsers(addMemberForTeam).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.email} ({u.role})
                  </option>
                ))}
              </select>
              {getAvailableUsers(addMemberForTeam).length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Todos os colaboradores cadastrados já são membros desta equipe.
                </div>
              )}
            </div>

            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: '#1e40af',
                marginBottom: 18,
              }}
            >
              Adicionar um membro à equipe vincula automaticamente o colaborador ao departamento
              <strong> {addMemberForTeam.department?.name}</strong>, concedendo acesso à fila de atendimento.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAddMemberForTeam(null)} disabled={addingMember}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingMember || !selectedUserId}>
                {addingMember ? 'Adicionando...' : 'Adicionar à Equipe'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Remove Member Confirm Modal */}
      {removingMember && (
        <Modal
          isOpen={!!removingMember}
          onClose={() => setRemovingMember(null)}
          title="Remover Membro da Equipe"
          subtitle={`${removingMember.member.user?.name} — ${removingMember.team.name}`}
        >
          <div
            style={{
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              gap: 10,
              fontSize: '0.85rem',
              color: '#92400e',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Atenção:</strong> Remover este membro retira o acesso operacional à fila do departamento{' '}
              <strong>{removingMember.team.department?.name}</strong>. Chamados atribuídos a ele serão devolvidos
              à fila coletiva. O histórico é preservado.
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setRemovingMember(null)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary btn-sm"
              style={{ background: '#dc2626', borderColor: '#dc2626' }}
              onClick={handleConfirmRemoveMember}
            >
              Confirmar Remoção
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

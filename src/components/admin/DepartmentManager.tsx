import React, { useState, useEffect } from 'react';
import { Department, UserProfile, DepartmentMember } from '../../types/database';
import { catalogService } from '../../services/catalogService';
import { authService } from '../../services/authService';
import { Modal } from '../layout/Modal';
import { EmptyState } from '../layout/EmptyState';
import {
  FolderKanban,
  Plus,
  Users,
  Archive,
  Edit2,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  UserX,
} from 'lucide-react';

interface DepartmentManagerProps {
  currentUser: UserProfile;
}

export const DepartmentManager: React.FC<DepartmentManagerProps> = ({ currentUser }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Department creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDescription, setDeptDescription] = useState('');

  // Attendants modal
  const [selectedDeptForMembers, setSelectedDeptForMembers] = useState<Department | null>(null);
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const list = await catalogService.getDepartments(false);
      setDepartments(list);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) return;

    try {
      await catalogService.createDepartment(
        {
          name: deptName,
          code: deptCode,
          description: deptDescription,
        },
        currentUser
      );
      setShowCreateModal(false);
      setDeptName('');
      setDeptCode('');
      setDeptDescription('');
      await loadDepartments();
    } catch (err: any) {
      alert(`Erro ao criar departamento: ${err.message}`);
    }
  };

  const handleOpenMembers = async (dept: Department) => {
    setSelectedDeptForMembers(dept);
    const m = await catalogService.getDepartmentMembers(dept.id);
    setMembers(m);
    const u = await authService.getAllUsers();
    setAllUsers(u);
  };

  const handleAddMember = async () => {
    if (!selectedDeptForMembers || !selectedUserIdToAdd) return;
    try {
      await catalogService.addDepartmentMember(selectedDeptForMembers.id, selectedUserIdToAdd, currentUser);
      setSelectedUserIdToAdd('');
      const m = await catalogService.getDepartmentMembers(selectedDeptForMembers.id);
      setMembers(m);
      await loadDepartments();
    } catch (err: any) {
      alert(`Erro ao vincular atendente: ${err.message}`);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedDeptForMembers) return;
    try {
      const res = await catalogService.removeDepartmentMember(
        selectedDeptForMembers.id,
        userId,
        currentUser
      );
      if (res.assignedTicketsCount > 0) {
        alert(
          `Atendente desvinculado. ${res.assignedTicketsCount} chamado(s) que estavam com ele foram devolvidos à fila coletiva para evitar tarefas abandonadas (Spec 9.4).`
        );
      }
      const m = await catalogService.getDepartmentMembers(selectedDeptForMembers.id);
      setMembers(m);
      await loadDepartments();
    } catch (err: any) {
      alert(`Erro ao desvincular: ${err.message}`);
    }
  };

  const handleArchive = async (deptId: string) => {
    if (!confirm('Deseja realmente arquivar este departamento? Chamados históricos serão preservados (Spec 11.1).')) return;
    try {
      await catalogService.archiveDepartment(deptId, currentUser);
      await loadDepartments();
    } catch (err: any) {
      alert(`Erro ao arquivar: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>
            Gerenciamento de Departamentos / Caixas
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Configure caixas de atendimento, chaves de protocolo e equipes autorizadas
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Novo Departamento
        </button>
      </div>

      {departments.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum departamento cadastrado"
          description="A Central de Serviços inicia vazia (Spec 3.1). Crie o primeiro departamento (ex: TI, Departamento Pessoal, Facilities) para montar o catálogo."
          actionText="Criar Primeiro Departamento"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {departments.map((dept) => (
            <div key={dept.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span
                    className="badge"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--mtp-blue-light)',
                      color: 'var(--mtp-navy-primary)',
                      fontWeight: 800,
                    }}
                  >
                    CHAVE: {dept.code}
                  </span>
                  <span className={`badge ${dept.is_active ? 'badge-resolved' : 'badge-closed'}`}>
                    {dept.is_active ? 'Ativo' : 'Arquivado'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 4 }}>
                  {dept.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                  {dept.description || 'Sem descrição cadastrada.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  <span>{dept.member_count || 0} atendente(s)</span>
                  <span>{dept.ticket_count || 0} chamado(s)</span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => handleOpenMembers(dept)}
                  >
                    <Users size={14} /> Equipe ({dept.member_count || 0})
                  </button>
                  {dept.is_active && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#dc2626' }}
                      onClick={() => handleArchive(dept.id)}
                      title="Arquivar departamento"
                    >
                      <Archive size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Department Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Novo Departamento / Caixa"
          subtitle="Cadastre uma nova área de atendimento para receber chamados"
        >
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: 14 }}>
              <label className="label label-required">Nome do Departamento</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Tecnologia da Informação"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label label-required">Chave / Prefixo de Protocolo</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: TI (será gerado TI-000001, TI-000002...)"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                maxLength={8}
                required
              />
              <p className="help-text">Prefixo maiúsculo único para identificar os chamados desta caixa (Spec 8.2).</p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Descrição da Área</label>
              <textarea
                className="textarea"
                placeholder="Descreva a finalidade desta caixa..."
                value={deptDescription}
                onChange={(e) => setDeptDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Criar Departamento
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Members / Attendants Modal */}
      {selectedDeptForMembers && (
        <Modal
          isOpen={!!selectedDeptForMembers}
          onClose={() => setSelectedDeptForMembers(null)}
          title={`Equipe de Atendimento: ${selectedDeptForMembers.name}`}
          subtitle="Atendentes vinculados podem visualizar e responder chamados desta fila coletiva (Spec 4.2)"
        >
          <div>
            {/* Add Member form */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <select
                className="select"
                style={{ flex: 1 }}
                value={selectedUserIdToAdd}
                onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
              >
                <option value="">Selecione um colaborador @mtp.com.br...</option>
                {allUsers
                  .filter((u) => !members.some((m) => m.user_id === u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
              </select>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddMember}
                disabled={!selectedUserIdToAdd}
              >
                <Plus size={16} /> Vincular Atendente
              </button>
            </div>

            {/* Current Members List */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>
                Atendentes Autorizados ({members.length})
              </h4>

              {members.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Nenhum atendente vinculado a esta caixa ainda.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {members.map((mem) => (
                    <div
                      key={mem.id}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--bg-main)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{mem.user?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mem.user?.email}</div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#dc2626' }}
                        onClick={() => handleRemoveMember(mem.user_id)}
                        title="Desvincular atendente desta caixa"
                      >
                        <UserX size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

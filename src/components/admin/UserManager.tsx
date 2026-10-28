import React, { useState, useEffect } from 'react';
import { UserProfile, DepartmentMember } from '../../types/database';
import { authService } from '../../services/authService';
import { Modal } from '../layout/Modal';
import { ShieldCheck, User, Users, ArrowRightLeft, ShieldAlert } from 'lucide-react';

interface UserManagerProps {
  currentUser: UserProfile;
  onRefreshCurrentUser: () => void;
}

export const UserManager: React.FC<UserManagerProps> = ({ currentUser, onRefreshCurrentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userDeptMap, setUserDeptMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Role transfer state
  const [targetUserForRole, setTargetUserForRole] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<'solicitante' | 'super_admin'>('solicitante');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const list = await authService.getAllUsers();
      setUsers(list);

      // Load attendant departments for each user
      const deptMap: Record<string, string[]> = {};
      for (const u of list) {
        const memberships = await authService.getUserDepartments(u.id);
        deptMap[u.id] = memberships.map((m) => m.department?.name || 'Caixa');
      }
      setUserDeptMap(deptMap);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForRole) return;

    try {
      setSubmitting(true);
      await authService.updateRole(targetUserForRole.id, newRole, currentUser, justification);
      setTargetUserForRole(null);
      setJustification('');
      await loadUsers();
      onRefreshCurrentUser();
      alert('Papel de acesso atualizado com sucesso e registrado na auditoria (Spec 3.3).');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>
          Gestão de Usuários & Equipes Corporativas
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Visualize identidades corporativas individuais (@mtp.com.br), vínculos de atendimento e permissões administrativas
        </p>
      </div>

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
              <th style={{ padding: '12px 16px' }}>Caixas de Atendimento</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const depts = userDeptMap[u.id] || [];
              const isSuper = u.role === 'super_admin';

              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: isSuper ? 'var(--mtp-navy-primary)' : 'var(--border-light)',
                          color: isSuper ? '#ffffff' : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {isSuper ? (
                      <span className="badge" style={{ background: 'rgba(91, 178, 221, 0.2)', color: 'var(--mtp-navy-primary)', border: '1px solid var(--mtp-blue-primary)' }}>
                        <ShieldCheck size={12} /> Super Admin
                      </span>
                    ) : (
                      <span className="badge badge-closed">Solicitante</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {depts.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {depts.map((d, i) => (
                          <span key={i} className="badge badge-open" style={{ fontSize: '0.7rem' }}>
                            {d}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                        Nenhum departamento
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setTargetUserForRole(u);
                        setNewRole(u.role === 'super_admin' ? 'solicitante' : 'super_admin');
                      }}
                      title="Alterar papel de administrador"
                    >
                      <ArrowRightLeft size={14} />
                      {u.role === 'super_admin' ? 'Revogar Super Admin' : 'Tornar Super Admin'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Role Transfer Modal */}
      {targetUserForRole && (
        <Modal
          isOpen={!!targetUserForRole}
          onClose={() => setTargetUserForRole(null)}
          title="Alterar Privilégio Administrativo (Spec 3.3)"
          subtitle={`Usuário afetado: ${targetUserForRole.name} (${targetUserForRole.email})`}
        >
          <form onSubmit={handleRoleChangeSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Novo Papel a Conceder</label>
              <select
                className="select"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
              >
                <option value="super_admin">Administrador Supremo (super_admin)</option>
                <option value="solicitante">Solicitante Normal (Revogar super_admin)</option>
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="label label-required">Justificativa Corporativa (Obrigatória para auditoria)</label>
              <textarea
                className="textarea"
                placeholder="Ex: Transição da administradora inicial de testes para a equipe definitiva de TI da MTP (Spec 3.3)"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                required
              />
            </div>

            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: '#92400e',
                marginBottom: 18,
                display: 'flex',
                gap: 8,
              }}
            >
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Atenção:</strong> Toda alteração no papel de Administrador Supremo é gravada na trilha de auditoria e não é permitido deixar o sistema sem nenhum administrador ativo.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setTargetUserForRole(null)}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? 'Gravando...' : 'Confirmar Alteração'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

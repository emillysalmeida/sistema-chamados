import React, { useState, useEffect } from 'react';
import {
  Ticket,
  TicketAnswer,
  TicketMessage,
  TicketEvent,
  UserProfile,
  TicketStatus,
  DepartmentMember,
} from '../../types/database';
import { ticketService } from '../../services/ticketService';
import { catalogService } from '../../services/catalogService';
import {
  ArrowLeft,
  UserCheck,
  Send,
  Lock,
  MessageSquare,
  Clock,
  CheckCircle,
  FileText,
  AlertCircle,
  ShieldAlert,
  UserPlus,
  RefreshCw,
} from 'lucide-react';

interface TicketDetailProps {
  ticketId: string;
  currentUser: UserProfile;
  onBack: () => void;
  onTicketUpdated: () => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticketId,
  currentUser,
  onBack,
  onTicketUpdated,
}) => {
  const [ticketData, setTicketData] = useState<{
    ticket: Ticket;
    answers: TicketAnswer[];
    messages: TicketMessage[];
    events: TicketEvent[];
    canViewInternalNotes: boolean;
    canActOnTicket: boolean;
    isSuperAdmin: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Messaging state
  const [messageTab, setMessageTab] = useState<'public' | 'internal'>('public');
  const [messageContent, setMessageContent] = useState('');
  const [submittingMessage, setSubmittingMessage] = useState(false);

  // Assignment modal / action
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [departmentAttendants, setDepartmentAttendants] = useState<DepartmentMember[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [assignJustification, setAssignJustification] = useState('');

  // Status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<TicketStatus>('em_andamento');

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await ticketService.getTicketDetail(ticketId, currentUser);
      setTicketData(data);
      if (data.canViewInternalNotes) {
        // Preload department attendants for assignment
        const members = await catalogService.getDepartmentMembers(data.ticket.department_id);
        setDepartmentAttendants(members);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar detalhes do chamado');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !ticketData) return;

    const isInternal = messageTab === 'internal';

    try {
      setSubmittingMessage(true);
      await ticketService.addMessage(ticketId, messageContent, isInternal, currentUser);
      setMessageContent('');
      await loadTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(`Erro ao enviar mensagem: ${err.message}`);
    } finally {
      setSubmittingMessage(false);
    }
  };

  const handleClaim = async () => {
    if (!ticketData) return;
    try {
      await ticketService.claimTicket(ticketId, currentUser);
      await loadTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketData) return;

    try {
      await ticketService.assignTicket(
        ticketId,
        selectedAssigneeId || null,
        currentUser,
        assignJustification
      );
      setShowAssignModal(false);
      await loadTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(`Erro ao atribuir: ${err.message}`);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketData) return;

    try {
      await ticketService.updateStatus(ticketId, targetStatus, currentUser);
      setShowStatusModal(false);
      await loadTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(`Erro ao alterar status: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <RefreshCw size={28} className="animate-spin" color="var(--mtp-blue-primary)" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Carregando detalhes do chamado...</p>
      </div>
    );
  }

  if (errorMsg || !ticketData) {
    return (
      <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: 36, textAlign: 'center' }}>
        <AlertCircle size={40} color="#dc2626" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontWeight: 700, color: '#991b1b' }}>Acesso Restrito</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 6, maxWidth: 440, margin: '6px auto 16px' }}>
          {errorMsg}
        </p>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>
    );
  }

  const { ticket, answers, messages, events, canViewInternalNotes, canActOnTicket, isSuperAdmin } = ticketData;

  const publicMessages = messages.filter((m) => !m.is_internal);
  const internalMessages = messages.filter((m) => m.is_internal);

  return (
    <div>
      {/* Top Back & Actions Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ paddingLeft: 0 }}>
          <ArrowLeft size={16} /> Voltar à lista
        </button>

        {/* Operational Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Claim Button: Voluntary assignment if ticket is unassigned (Spec 9.2) */}
          {canActOnTicket && !ticket.assigned_to && (
            <button className="btn btn-accent btn-sm" onClick={handleClaim}>
              <UserCheck size={16} /> Assumir Chamado
            </button>
          )}

          {/* Admin Assign Button: Super Admin can assign/redistribute to any attendant of the box (Spec 9.3) */}
          {isSuperAdmin && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedAssigneeId(ticket.assigned_to || '');
                setShowAssignModal(true);
              }}
            >
              <UserPlus size={16} /> Designar Responsável
            </button>
          )}

          {/* Change Status */}
          {canActOnTicket && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setTargetStatus(ticket.status);
                setShowStatusModal(true);
              }}
            >
              Alterar Status ({ticket.status})
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Ticket Header & Content (Left 70%, Sidebar 30%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Left Column: Details, Form Answers, Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Ticket Header Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: 'var(--mtp-navy-primary)',
                  letterSpacing: '0.02em',
                }}
              >
                {ticket.protocol}
              </span>
              <span className={`badge badge-${ticket.status}`}>
                {ticket.status}
              </span>
              <span
                className="badge"
                style={{
                  background:
                    ticket.priority === 'urgente'
                      ? 'var(--priority-urgente-bg)'
                      : ticket.priority === 'alta'
                      ? 'var(--priority-alta-bg)'
                      : 'var(--priority-media-bg)',
                  color:
                    ticket.priority === 'urgente'
                      ? 'var(--priority-urgente-text)'
                      : ticket.priority === 'alta'
                      ? 'var(--priority-alta-text)'
                      : 'var(--priority-media-text)',
                  textTransform: 'capitalize',
                }}
              >
                {ticket.priority}
              </span>
            </div>

            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              {ticket.subject}
            </h1>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Aberto em {new Date(ticket.created_at).toLocaleString('pt-BR')} por{' '}
              <strong>{ticket.requester_name}</strong> ({ticket.requester_email})
            </div>
          </div>

          {/* Form Answers Card */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 14 }}>
              Dados do Formulário Submetido
            </h3>

            {answers.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Nenhum campo personalizado associado.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {answers.map((ans) => (
                  <div
                    key={ans.id}
                    style={{
                      background: 'var(--bg-main)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      {ans.field_label}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: 4, fontWeight: 500 }}>
                      {typeof ans.answer_value === 'boolean'
                        ? ans.answer_value
                          ? 'Sim'
                          : 'Não'
                        : typeof ans.answer_value === 'object' && ans.answer_value !== null
                        ? ans.answer_value.name || JSON.stringify(ans.answer_value)
                        : ans.answer_value || '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages & Conversations Card */}
          <div className="card">
            {/* Tabs: Public Responses vs Internal Notes (Spec 8.6) */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--border-light)',
                marginBottom: 16,
                gap: 16,
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                style={{
                  padding: '8px 4px',
                  borderRadius: 0,
                  borderBottom: messageTab === 'public' ? '2px solid var(--mtp-navy-primary)' : 'none',
                  color: messageTab === 'public' ? 'var(--mtp-navy-primary)' : 'var(--text-muted)',
                  fontWeight: messageTab === 'public' ? 700 : 500,
                }}
                onClick={() => setMessageTab('public')}
              >
                <MessageSquare size={16} />
                Respostas Públicas ({publicMessages.length})
              </button>

              {/* Only attendants and admin can see Internal Notes Tab */}
              {canViewInternalNotes && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    padding: '8px 4px',
                    borderRadius: 0,
                    borderBottom: messageTab === 'internal' ? '2px solid #8b5cf6' : 'none',
                    color: messageTab === 'internal' ? '#8b5cf6' : 'var(--text-muted)',
                    fontWeight: messageTab === 'internal' ? 700 : 500,
                  }}
                  onClick={() => setMessageTab('internal')}
                >
                  <Lock size={16} />
                  Notas Internas ({internalMessages.length})
                </button>
              )}
            </div>

            {/* Internal Note Banner for Attendants */}
            {messageTab === 'internal' && (
              <div
                style={{
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  color: '#6d28d9',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Lock size={16} />
                <strong>Área Confidencial:</strong> Notas internas são visíveis apenas para atendentes autorizados e administradores. O solicitante nunca terá acesso.
              </div>
            )}

            {/* Message Thread */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {(messageTab === 'public' ? publicMessages : internalMessages).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Nenhuma mensagem registrada nesta aba ainda.
                </div>
              ) : (
                (messageTab === 'public' ? publicMessages : internalMessages).map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      border: msg.is_internal ? '1px solid #ddd6fe' : '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      background: msg.is_internal ? '#faf5ff' : '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ color: 'var(--mtp-navy-primary)' }}>{msg.author_name}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>({msg.author_email})</span>
                        {msg.is_internal && (
                          <span className="badge" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                            Nota Interna
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(msg.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handleSendMessage}>
              <label className="label">
                {messageTab === 'public' ? 'Responder ao Solicitante / Equipe' : 'Adicionar Nova Nota Interna'}
              </label>
              <textarea
                className="textarea"
                style={{ minHeight: 80, marginBottom: 10 }}
                placeholder={
                  messageTab === 'public'
                    ? 'Digite sua resposta pública aqui...'
                    : 'Escreva anotações internas da equipe de atendimento...'
                }
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                disabled={submittingMessage}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className={`btn ${messageTab === 'internal' ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                  disabled={submittingMessage || !messageContent.trim()}
                >
                  <Send size={14} />
                  {submittingMessage ? 'Enviando...' : messageTab === 'internal' ? 'Salvar Nota Interna' : 'Enviar Resposta'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Meta details, Responsible Agent, Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Metadata Card */}
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
              Informações do Chamado
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Departamento</span>
                <strong style={{ color: 'var(--mtp-navy-primary)' }}>{ticket.department?.name} ({ticket.department?.code})</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Tipo de Solicitação</span>
                <strong>{ticket.service_type?.name}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Responsável Principal</span>
                {ticket.assignee ? (
                  <strong style={{ color: 'var(--mtp-navy-primary)' }}>{ticket.assignee.name}</strong>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Fila não atribuída</span>
                )}
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Última Atualização</span>
                <span>{new Date(ticket.updated_at).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Timeline / Audit Trail Card */}
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
              Histórico de Eventos
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto' }}>
              {events.map((ev) => (
                <div key={ev.id} style={{ fontSize: '0.775rem', borderLeft: '2px solid var(--border-light)', paddingLeft: 10 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{ev.description}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 2 }}>
                    {new Date(ev.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Modal (Super Admin) */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Designar Responsável pelo Chamado</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Caixa: {ticket.department?.name}
              </p>
            </div>
            <form onSubmit={handleAssignSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Atendente autorizado da caixa</label>
                <select
                  className="select"
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                >
                  <option value="">Devolver para a fila geral (Não atribuído)</option>
                  {departmentAttendants.map((mem) => (
                    <option key={mem.user_id} value={mem.user_id}>
                      {mem.user?.name} ({mem.user?.email})
                    </option>
                  ))}
                </select>
                {departmentAttendants.length === 0 && (
                  <p className="help-text" style={{ color: '#dc2626' }}>
                    Esta caixa não possui atendentes vinculados ainda. Cadastre atendentes na aba de Administração.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="label">Justificativa da Designação (Opcional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Demanda urgente de infraestrutura"
                  value={assignJustification}
                  onChange={(e) => setAssignJustification(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAssignModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Salvar Atribuição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Alterar Status do Chamado</h3>
            </div>
            <form onSubmit={handleStatusSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Novo Status</label>
                <select
                  className="select"
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as TicketStatus)}
                >
                  <option value="aberto">Aberto</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="aguardando_solicitante">Aguardando Solicitante</option>
                  <option value="resolvido">Resolvido (Concluir Atendimento)</option>
                  <option value="fechado">Fechado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowStatusModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Confirmar Mudança
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

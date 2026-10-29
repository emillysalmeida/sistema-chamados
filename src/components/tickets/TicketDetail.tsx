import React, { useState, useEffect } from 'react';
import {
  Ticket,
  TicketAnswer,
  TicketMessage,
  TicketEvent,
  UserProfile,
  TicketStatus,
  DepartmentMember,
  FormVersion,
} from '../../types/database';
import { supabase } from '../../lib/supabase';
import { ticketService } from '../../services/ticketService';
import { catalogService } from '../../services/catalogService';
import { storageService } from '../../services/storageService';
import { FormRenderer } from '../forms/FormRenderer';
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
  ArrowRightLeft,
  UserMinus,
  CheckCircle2,
  Edit3,
  Paperclip,
  Info,
  ShieldCheck,
  X,
  Download,
  Eye,
  FileCode,
  Image as ImageIcon,
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

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelJustification, setCancelJustification] = useState('');
  const [cancellingTicket, setCancellingTicket] = useState(false);

  // IT Approval & Requester Edit State (Refinamento 05)
  const [formVersion, setFormVersion] = useState<FormVersion | null>(null);
  const [showEditAnswersModal, setShowEditAnswersModal] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, any>>({});
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [approvingTicket, setApprovingTicket] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await ticketService.getTicketDetail(ticketId, currentUser);
      setTicketData(data);

      // Load form schema version for requester edit
      if (data.ticket.form_version_id) {
        const { data: ver } = await supabase
          .from('form_versions')
          .select('*')
          .eq('id', data.ticket.form_version_id)
          .maybeSingle();

        if (ver) {
          setFormVersion(ver as FormVersion);
        }
      }

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

  const formatStatusLabel = (status: TicketStatus) => {
    switch (status) {
      case 'aguardando_aprovacao':
        return 'Aguardando Aprovação';
      case 'aberto':
        return 'Aberto';
      case 'em_andamento':
        return 'Em Andamento';
      case 'aguardando_solicitante':
        return 'Aguardando Solicitante';
      case 'resolvido':
        return 'Resolvido';
      case 'fechado':
        return 'Fechado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
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

  // Ação explícita de cancelamento
  const handleCancelTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketData) return;

    try {
      setCancellingTicket(true);
      await ticketService.cancelTicket(ticketId, currentUser, cancelJustification);
      setShowCancelModal(false);
      setCancelJustification('');
      await loadTicket();
      onTicketUpdated();
      alert(`Chamado ${ticketData.ticket.protocol} foi cancelado com sucesso.`);
    } catch (err: any) {
      alert(`Erro ao cancelar chamado: ${err.message}`);
    } finally {
      setCancellingTicket(false);
    }
  };
  const handleApproveTicket = async () => {
    if (!ticketData) return;
    const confirmed = window.confirm(
      `Confirmar a aprovação da solicitação ${ticketData.ticket.protocol}?\n\nO chamado mudará para "Aberto", terá sua edição bloqueada para o solicitante e será liberado para atendimento normal pela equipe de TI.`
    );
    if (!confirmed) return;

    try {
      setApprovingTicket(true);
      await ticketService.approveTicket(ticketId, currentUser);
      await loadTicket();
      onTicketUpdated();
      alert(`Solicitação ${ticketData.ticket.protocol} aprovada com sucesso! Liberada para atendimento.`);
    } catch (err: any) {
      alert(`Erro ao aprovar chamado: ${err.message}`);
    } finally {
      setApprovingTicket(false);
    }
  };

  // IT action to request info / documents (Refinamento 05)
  const handleRequestInfo = () => {
    setMessageTab('public');
    setMessageContent(
      'Olá! Para que possamos dar continuidade à análise e aprovação desta solicitação, por favor utilize a opção "Editar Solicitação" neste chamado para complementar as seguintes informações e/ou anexar os documentos necessários:\n\n- '
    );
    const textarea = document.getElementById('ticket_response_textarea');
    if (textarea) {
      textarea.scrollIntoView({ behavior: 'smooth' });
      textarea.focus();
    }
  };

  // Requester opens edit answers modal (Refinamento 05)
  const handleOpenEditAnswers = () => {
    if (!ticketData) return;
    const initial: Record<string, any> = {};
    ticketData.answers.forEach((ans) => {
      initial[ans.field_id] = ans.answer_value;
    });
    setEditedAnswers(initial);
    setShowEditAnswersModal(true);
  };

  // Requester saves updated form answers (Refinamento 05)
  const handleSaveEditedAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketData || !formVersion) return;

    try {
      setSavingAnswers(true);
      const structuredAnswers = await Promise.all(
        formVersion.fields_schema.map(async (f) => {
          const val = editedAnswers[f.id] ?? null;
          if (f.type === 'file' && val && val._file instanceof File) {
            // Upload real obrigatório
            const uploaded = await storageService.uploadAttachment(
              val._file,
              ticketData.ticket.protocol || ticketId,
              currentUser
            );
            return {
              field_id: f.id,
              field_label: f.label,
              field_type: f.type,
              answer_value: uploaded,
            };
          }

          const cleanVal = val && val._file ? { name: val.name, size: val.size, type: val.type } : val;
          return {
            field_id: f.id,
            field_label: f.label,
            field_type: f.type,
            answer_value: cleanVal,
          };
        })
      );

      await ticketService.updateTicketAnswers(ticketId, structuredAnswers, currentUser);
      setShowEditAnswersModal(false);
      await loadTicket();
      onTicketUpdated();
      alert('Informações e anexos da solicitação atualizados com sucesso!');
    } catch (err: any) {
      alert(`Erro ao atualizar formulário: ${err.message}`);
    } finally {
      setSavingAnswers(false);
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

  const isRequester = ticket.requester_id === currentUser.id;
  const isAwaitingApproval = ticket.status === 'aguardando_aprovacao';

  // Check if there was an IT approval event
  const approvalEvent = events.find((e) => e.action_type === 'aprovacao_ti');

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
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ paddingLeft: 0 }}>
          <ArrowLeft size={16} /> Voltar à lista
        </button>

        {/* Operational Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* FLOW: AGUARDANDO APROVAÇÃO (Refinamento 05) */}
          {isAwaitingApproval ? (
            <>
              {/* Solicitante: Editar solicitação antes da aprovação */}
              {isRequester && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleOpenEditAnswers}
                  title="Editar respostas ou adicionar anexos complementares"
                >
                  <Edit3 size={15} /> Editar Solicitação
                </button>
              )}

              {/* Equipe da TI / Admin: Solicitar informações ou comprovantes */}
              {canActOnTicket && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleRequestInfo}
                  title="Enviar mensagem solicitando esclarecimentos ou documentação ao colaborador"
                >
                  <MessageSquare size={15} /> Solicitar Informações / Comprovantes
                </button>
              )}

              {/* Equipe da TI / Admin: Aprovar solicitação */}
              {canActOnTicket && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleApproveTicket}
                  disabled={approvingTicket}
                  style={{ background: '#16a34a', borderColor: '#15803d' }}
                  title="Liberar o chamado para atendimento normal pela equipe"
                >
                  <CheckCircle2 size={16} /> Aprovar Solicitação
                </button>
              )}
            </>
          ) : (
            /* FLOW NORMAL: Chamado já aprovado ou em atendimento */
            <>
              {/* Assumir: qualquer atendente autorizado pode assumir, mesmo se já atribuído a outro */}
              {canActOnTicket &&
                ticket.assigned_to !== currentUser.id &&
                !['resolvido', 'fechado', 'cancelado'].includes(ticket.status) && (
                  <button className="btn btn-accent btn-sm" onClick={handleClaim}>
                    <UserCheck size={16} />
                    {ticket.assigned_to ? 'Assumir de ' + (ticket.assignee?.name?.split(' ')[0] || 'outro') : 'Assumir Chamado'}
                  </button>
                )}

              {/* Admin: Designar / Redistribuir para qualquer atendente da caixa (Spec 9.3) */}
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

              {/* Alterar status (apenas para chamados fora de aprovação) */}
              {canActOnTicket && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setTargetStatus(ticket.status);
                    setShowStatusModal(true);
                  }}
                >
                  Alterar Status ({formatStatusLabel(ticket.status)})
                </button>
              )}
            </>
          )}

          {/* Ação Explícita: Cancelar Chamado */}
          {!['resolvido', 'fechado', 'cancelado'].includes(ticket.status) &&
            (isRequester || canActOnTicket) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCancelModal(true)}
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                title="Cancelar este chamado"
              >
                <X size={15} /> Cancelar Chamado
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
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
                {formatStatusLabel(ticket.status)}
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
              {ticket.department && (
                <span className="badge badge-open" style={{ fontSize: '0.7rem' }}>
                  {ticket.department.name} ({ticket.department.code})
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              {ticket.subject}
            </h1>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Aberto em {new Date(ticket.created_at).toLocaleString('pt-BR')} por{' '}
              <strong>{ticket.requester_name}</strong> ({ticket.requester_email})
            </div>

            {/* Approval Info Banner (Refinamento 05) */}
            {isAwaitingApproval && (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 16px',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Clock size={20} color="#b45309" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.4 }}>
                  <strong>Solicitação Aguardando Aprovação da TI:</strong>{' '}
                  {isRequester
                    ? 'Seu chamado está sob análise da equipe técnica. Enquanto estiver nesta etapa, você pode editar informações ou incluir comprovantes caso necessário.'
                    : 'Esta solicitação precisa de análise e aprovação da equipe técnica para ser liberada para o atendimento.'}
                </div>
              </div>
            )}

            {/* Approved by TI indicator */}
            {!isAwaitingApproval && approvalEvent && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <ShieldCheck size={18} color="#15803d" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.8rem', color: '#166534' }}>
                  <strong>Aprovado pela TI:</strong> {approvalEvent.description} em{' '}
                  {new Date(approvalEvent.created_at).toLocaleString('pt-BR')}.
                </div>
              </div>
            )}
          </div>

          {/* Form Answers Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mtp-navy-primary)' }}>
                  Dados do Formulário Submetido
                </h3>
                {ticket.service_type && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Serviço: <strong>{ticket.service_type.name}</strong>
                  </div>
                )}
              </div>

              {/* Botão de edição para solicitante se estiver aguardando aprovação */}
              {isAwaitingApproval && isRequester && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleOpenEditAnswers}
                  style={{ fontSize: '0.78rem' }}
                >
                  <Edit3 size={14} /> Editar Respostas
                </button>
              )}

              {/* Indicador de bloqueio APENAS se houver aprovação efetivamente registrada */}
              {!isAwaitingApproval && (ticket.approved_at || approvalEvent) && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Lock size={12} /> Formulário bloqueado após aprovação
                </span>
              )}
            </div>

            {answers.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Nenhum campo personalizado associado.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {answers.map((ans) => {
                  const isFile = ans.field_type === 'file' || (typeof ans.answer_value === 'object' && ans.answer_value?.name);

                  return (
                    <div
                      key={ans.id}
                      style={{
                        background: 'var(--bg-main)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        border: '1px solid var(--border-light)',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                        {ans.field_label}
                      </div>

                      {isFile ? (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            {ans.answer_value?.type?.startsWith('image/') ? (
                              <ImageIcon size={18} color="var(--mtp-blue-primary)" />
                            ) : ans.answer_value?.type?.includes('pdf') ? (
                              <FileText size={18} color="#dc2626" />
                            ) : (
                              <Paperclip size={18} color="var(--mtp-blue-primary)" />
                            )}
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--mtp-navy-primary)', wordBreak: 'break-all' }}>
                              {ans.answer_value?.name || 'Arquivo anexado'}
                            </div>
                            {ans.answer_value?.size && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                ({Math.round(ans.answer_value.size / 1024)} KB)
                              </span>
                            )}
                          </div>

                          {/* Ações de Visualizar e Baixar Anexo */}
                          {ans.answer_value?.data_url || ans.answer_value?.storage_path ? (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 10px', fontSize: '0.75rem', gap: 4 }}
                                onClick={async () => {
                                  try {
                                    await storageService.viewFile(ans.answer_value);
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }}
                              >
                                <Eye size={13} /> Visualizar
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 10px', fontSize: '0.75rem', gap: 4 }}
                                onClick={async () => {
                                  try {
                                    await storageService.downloadFile(ans.answer_value);
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }}
                              >
                                <Download size={13} /> Baixar
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                              ⚠️ Arquivo registrado apenas como metadado legível nos chamados anteriores. Novos anexos são armazenados para visualização e download.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {typeof ans.answer_value === 'boolean'
                            ? ans.answer_value
                              ? 'Sim'
                              : 'Não'
                            : typeof ans.answer_value === 'object' && ans.answer_value !== null
                            ? ans.answer_value.name || JSON.stringify(ans.answer_value)
                            : ans.answer_value || '-'}
                        </div>
                      )}
                    </div>
                  );
                })}
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
              }}
            >
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: messageTab === 'public' ? '2px solid var(--mtp-navy-primary)' : '2px solid transparent',
                  fontWeight: messageTab === 'public' ? 700 : 500,
                  color: messageTab === 'public' ? 'var(--mtp-navy-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
                onClick={() => setMessageTab('public')}
              >
                Respostas Públicas ({publicMessages.length})
              </button>

              {canViewInternalNotes && (
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: messageTab === 'internal' ? '2px solid var(--mtp-navy-primary)' : '2px solid transparent',
                    fontWeight: messageTab === 'internal' ? 700 : 500,
                    color: messageTab === 'internal' ? 'var(--mtp-navy-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onClick={() => setMessageTab('internal')}
                >
                  <Lock size={14} /> Notas Internas ({internalMessages.length})
                </button>
              )}
            </div>

            {/* Messages Thread */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              {(messageTab === 'public' ? publicMessages : internalMessages).length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                  {messageTab === 'public'
                    ? 'Nenhuma mensagem pública registrada ainda.'
                    : 'Nenhuma nota interna registrada pela equipe.'}
                </p>
              ) : (
                (messageTab === 'public' ? publicMessages : internalMessages).map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      background: msg.is_internal ? '#fffbeb' : '#ffffff',
                      border: msg.is_internal ? '1px solid #fde68a' : '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--mtp-navy-primary)' }}>
                          {msg.author_name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({msg.author_email})
                        </span>
                        {msg.is_internal && (
                          <span className="badge" style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e' }}>
                            Nota Interna
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage}>
              <div style={{ marginBottom: 10 }}>
                <textarea
                  id="ticket_response_textarea"
                  className="textarea"
                  rows={3}
                  placeholder={
                    messageTab === 'public'
                      ? 'Escreva uma resposta visível para o solicitante e equipe...'
                      : 'Escreva uma nota interna estritamente confidencial (não visível ao solicitante)...'
                  }
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {messageTab === 'public'
                    ? 'Resposta visível a todos os envolvidos no chamado.'
                    : 'Nota interna estritamente confidencial para a equipe.'}
                </span>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submittingMessage || !messageContent.trim()}
                >
                  <Send size={14} /> Enviar {messageTab === 'public' ? 'Resposta' : 'Nota'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Ticket Sidebar / Meta & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Assignment & Operational Status Card */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 14 }}>
              Responsável Principal
            </h3>

            {ticket.assigned_to && ticket.assignee ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--mtp-navy-primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    {ticket.assignee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {ticket.assignee.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {ticket.assignee.email}
                    </div>
                  </div>
                </div>

                {ticket.assigned_to === currentUser.id && (
                  <div
                    className="badge"
                    style={{
                      background: 'var(--mtp-blue-light)',
                      color: 'var(--mtp-navy-primary)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      display: 'inline-block',
                      marginBottom: 8,
                    }}
                  >
                    Você é o responsável
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <span className="badge badge-waiting" style={{ fontSize: '0.75rem' }}>
                  Fila Geral (Não Atribuído)
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Chamado disponível na fila compartilhada do departamento.
                </p>
              </div>
            )}
          </div>

          {/* Timeline & Audit Events Card */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 14 }}>
              Histórico do Chamado ({events.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.map((evt) => (
                <div key={evt.id} style={{ display: 'flex', gap: 10, fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: evt.action_type === 'aprovacao_ti' ? '#16a34a' : 'var(--mtp-blue-primary)',
                        marginTop: 4,
                      }}
                    />
                    <div style={{ width: 1, flex: 1, background: 'var(--border-light)', minHeight: 16 }} />
                  </div>
                  <div style={{ paddingBottom: 6 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{evt.description}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {new Date(evt.created_at).toLocaleString('pt-BR')} • {evt.actor_name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Answers Modal (Refinamento 05 — Solicitante) */}
      {showEditAnswersModal && formVersion && (
        <div className="modal-overlay" onClick={() => setShowEditAnswersModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--mtp-navy-primary)' }}>
                  Editar Solicitação
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Atualize suas respostas e adicione comprovantes enquanto o chamado aguarda aprovação da TI.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowEditAnswersModal(false)}
                style={{ padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedAnswers} style={{ padding: 20 }}>
              <div style={{ marginBottom: 20 }}>
                <FormRenderer
                  fields={formVersion.fields_schema}
                  values={editedAnswers}
                  onChange={(fieldId, val) => setEditedAnswers((prev) => ({ ...prev, [fieldId]: val }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowEditAnswersModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={savingAnswers}
                >
                  {savingAnswers ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal (Admin only) */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Designar Responsável Principal</h3>
            </div>
            <form onSubmit={handleAssignSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Atendente Autorizado da Caixa</label>
                <select
                  className="select"
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                >
                  <option value="">Devolver para Fila Coletiva (Não Atribuído)</option>
                  {departmentAttendants.map((mem) => (
                    <option key={mem.user_id} value={mem.user_id}>
                      {mem.user?.name} ({mem.user?.email})
                    </option>
                  ))}
                </select>
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
      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#dc2626' }}>Cancelar Chamado</h3>
            </div>
            <form onSubmit={handleCancelTicket} style={{ padding: 20 }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                Tem certeza que deseja cancelar o chamado <strong>{ticket.protocol}</strong>? O registro e o histórico de atividades serão mantidos no sistema com status "Cancelado".
              </p>

              <div style={{ marginBottom: 16 }}>
                <label className="label">
                  Motivo / Justificativa {isRequester ? '(opcional)' : '* (obrigatório para atendimento/admin)'}
                </label>
                <textarea
                  className="textarea"
                  style={{ minHeight: 80 }}
                  placeholder="Explique o motivo do cancelamento deste chamado..."
                  value={cancelJustification}
                  onChange={(e) => setCancelJustification(e.target.value)}
                  required={!isRequester}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancellingTicket}
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="btn btn-sm"
                  disabled={cancellingTicket}
                  style={{ background: '#dc2626', color: '#ffffff', borderColor: '#b91c1c' }}
                >
                  {cancellingTicket ? 'Cancelando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

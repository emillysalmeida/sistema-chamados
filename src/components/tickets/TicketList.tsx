import React, { useState } from 'react';
import { Ticket, TicketStatus, TicketPriority } from '../../types/database';
import { Search, Filter, Clock, User, ArrowUpDown, Inbox } from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  title: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenCreate?: () => void;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  onSelectTicket,
  title,
  subtitle,
  emptyTitle = 'Nenhum chamado encontrado',
  emptyDescription = 'Não existem solicitações cadastradas nesta visão.',
  onOpenCreate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [priorityFilter, setPriorityFilter] = useState<string>('todos');

  // Filter tickets
  const filtered = tickets.filter((t) => {
    const matchesSearch =
      t.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.requester_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'todos' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'todos' || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'aguardando_aprovacao':
        return <span className="badge badge-aguardando_aprovacao">Aguardando Aprovação</span>;
      case 'aberto':
        return <span className="badge badge-open">Aberto</span>;
      case 'em_andamento':
        return <span className="badge badge-progress">Em Andamento</span>;
      case 'aguardando_solicitante':
        return <span className="badge badge-waiting">Aguardando Solicitante</span>;
      case 'resolvido':
        return <span className="badge badge-resolved">Resolvido</span>;
      case 'fechado':
        return <span className="badge badge-closed">Fechado</span>;
      case 'cancelado':
        return <span className="badge badge-canceled">Cancelado</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    const styles: Record<string, { bg: string; text: string }> = {
      baixa: { bg: 'var(--priority-baixa-bg)', text: 'var(--priority-baixa-text)' },
      media: { bg: 'var(--priority-media-bg)', text: 'var(--priority-media-text)' },
      alta: { bg: 'var(--priority-alta-bg)', text: 'var(--priority-alta-text)' },
      urgente: { bg: 'var(--priority-urgente-bg)', text: 'var(--priority-urgente-text)' },
    };
    const s = styles[priority] || styles.media;
    return (
      <span
        className="badge"
        style={{ background: s.bg, color: s.text, textTransform: 'capitalize' }}
      >
        {priority}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', width: 280 }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 12, top: 12 }}
          />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Buscar por protocolo, assunto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter dropdowns */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
            <select
              className="select"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="aguardando_aprovacao">Aguardando Aprovação</option>
              <option value="aberto">Aberto</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="aguardando_solicitante">Aguardando Solicitante</option>
              <option value="resolvido">Resolvido</option>
              <option value="fechado">Fechado</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Prioridade:</span>
            <select
              className="select"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="todos">Todas</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table / List */}
      {filtered.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-light)',
            padding: '48px 20px',
            textAlign: 'center',
          }}
        >
          <Inbox size={42} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emptyTitle}</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4, maxWidth: 440, margin: '4px auto 16px' }}>
            {emptyDescription}
          </p>
          {onOpenCreate && (
            <button className="btn btn-primary btn-sm" onClick={onOpenCreate}>
              Abrir Primeiro Chamado
            </button>
          )}
        </div>
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
                <th style={{ padding: '12px 16px' }}>Protocolo</th>
                <th style={{ padding: '12px 16px' }}>Assunto / Resumo</th>
                <th style={{ padding: '12px 16px' }}>Departamento</th>
                <th style={{ padding: '12px 16px' }}>Solicitante</th>
                <th style={{ padding: '12px 16px' }}>Prioridade</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Responsável</th>
                <th style={{ padding: '12px 16px' }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  style={{
                    borderBottom: '1px solid var(--border-light)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onClick={() => onSelectTicket(t)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--mtp-navy-primary)' }}>
                    {t.protocol}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: 280 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.subject}
                    </div>
                    {t.service_type?.name && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {t.service_type.name}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {t.department?.name || 'Geral'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontWeight: 500 }}>{t.requester_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.requester_email}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getPriorityBadge(t.priority)}</td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(t.status)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {t.assignee ? (
                      <span style={{ fontWeight: 600, color: 'var(--mtp-navy-primary)' }}>
                        {t.assignee.name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Não atribuído
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {new Date(t.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

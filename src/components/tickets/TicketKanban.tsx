import React, { useState } from 'react';
import { Ticket, TicketStatus } from '../../types/database';
import { Clock, User, AlertCircle, CheckCircle } from 'lucide-react';

interface TicketKanbanProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
}

const COLUMNS: { id: TicketStatus; label: string; color: string }[] = [
  { id: 'aberto', label: 'Aberto', color: 'var(--mtp-blue-primary)' },
  { id: 'em_andamento', label: 'Em Andamento', color: '#8b5cf6' },
  { id: 'aguardando_solicitante', label: 'Aguardando Solicitante', color: '#f59e0b' },
  { id: 'resolvido', label: 'Resolvido', color: '#10b981' },
  { id: 'fechado', label: 'Fechado', color: '#64748b' },
];

export const TicketKanban: React.FC<TicketKanbanProps> = ({ tickets, onSelectTicket }) => {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>
          Quadro Kanban de Atendimento
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Visualização por estágio operacional das solicitações da área
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(240px, 1fr))`,
          gap: 14,
          alignItems: 'start',
          overflowX: 'auto',
          paddingBottom: 16,
        }}
      >
        {COLUMNS.map((col) => {
          const colTickets = tickets.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              style={{
                background: '#f1f5f9',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 12px',
                minHeight: 500,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 4px 8px',
                  borderBottom: `2px solid ${col.color}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {col.label}
                  </span>
                </div>
                <span
                  className="badge"
                  style={{
                    background: '#ffffff',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {colTickets.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                {colTickets.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 12px',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                    }}
                  >
                    Nenhum chamado
                  </div>
                ) : (
                  colTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="card card-interactive"
                      style={{ padding: '12px 14px' }}
                      onClick={() => onSelectTicket(ticket)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--mtp-navy-primary)',
                          }}
                        >
                          {ticket.protocol}
                        </span>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.65rem',
                            textTransform: 'capitalize',
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
                          }}
                        >
                          {ticket.priority}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          marginBottom: 8,
                          lineHeight: 1.3,
                        }}
                      >
                        {ticket.subject}
                      </div>

                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                        {ticket.department?.name} • Solicitado por {ticket.requester_name}
                      </div>

                      <div
                        style={{
                          borderTop: '1px solid var(--border-light)',
                          paddingTop: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.725rem',
                        }}
                      >
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {ticket.assignee ? (
                            <strong style={{ color: 'var(--mtp-navy-primary)' }}>{ticket.assignee.name}</strong>
                          ) : (
                            <em style={{ color: 'var(--text-muted)' }}>Sem responsável</em>
                          )}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {new Date(ticket.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

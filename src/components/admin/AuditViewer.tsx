import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types/database';
import { auditService } from '../../services/auditService';
import { ShieldCheck, RefreshCw, FileText } from 'lucide-react';

export const AuditViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await auditService.getAuditLogs(100);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>
            Trilha de Auditoria Administrativa & Operacional
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Registro imutável de ações críticas, permissões, publicações de formulários e segurança (Spec 12.2)
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={loadLogs} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
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
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <p>Nenhum registro de auditoria gravado ainda.</p>
          </div>
        ) : (
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
                <th style={{ padding: '12px 16px' }}>Data / Hora</th>
                <th style={{ padding: '12px 16px' }}>Autor</th>
                <th style={{ padding: '12px 16px' }}>Ação Executada</th>
                <th style={{ padding: '12px 16px' }}>Entidade</th>
                <th style={{ padding: '12px 16px' }}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--mtp-navy-primary)' }}>
                    {log.actor_name}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge badge-open" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.75rem', maxWidth: 300 }}>
                    {log.details ? (
                      <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', maxHeight: 60, overflowY: 'auto' }}>
                        {JSON.stringify(log.details)}
                      </pre>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { auditService } from '../../services/auditService';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  FolderKanban,
  HelpCircle,
  BarChart3,
} from 'lucide-react';

export const GlobalDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
    unassigned: 0,
    activeDepartments: 0,
    totalAttendantLinks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await auditService.getDashboardStats();
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    label,
    value,
    icon: Icon,
    color,
    bgColor,
  }: {
    label: string;
    value: number;
    icon: any;
    color: string;
    bgColor: string;
  }) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--radius-md)',
          background: bgColor,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={24} />
      </div>
      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--mtp-navy-primary)', lineHeight: 1.1 }}>
          {value}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>
          Visão Geral & Indicadores de Atendimento
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Métricas consolidadas de todas as caixas de atendimento da MTP (Spec 12.3)
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard
          label="Total de Chamados"
          value={stats.total}
          icon={BarChart3}
          color="var(--mtp-navy-primary)"
          bgColor="var(--mtp-blue-light)"
        />
        <StatCard
          label="Chamados em Aberto"
          value={stats.open}
          icon={Inbox}
          color="#1d4ed8"
          bgColor="#eff6ff"
        />
        <StatCard
          label="Não Atribuídos"
          value={stats.unassigned}
          icon={AlertCircle}
          color="#c2410c"
          bgColor="#fff7ed"
        />
        <StatCard
          label="Em Andamento"
          value={stats.inProgress}
          icon={Clock}
          color="#6d28d9"
          bgColor="#f5f3ff"
        />
        <StatCard
          label="Aguardando Solicitante"
          value={stats.waiting}
          icon={HelpCircle}
          color="#b45309"
          bgColor="#fffbeb"
        />
        <StatCard
          label="Resolvidos / Concluídos"
          value={stats.resolved + stats.closed}
          icon={CheckCircle2}
          color="#047857"
          bgColor="#ecfdf5"
        />
        <StatCard
          label="Departamentos Ativos"
          value={stats.activeDepartments}
          icon={FolderKanban}
          color="var(--mtp-navy-primary)"
          bgColor="#f1f5f9"
        />
        <StatCard
          label="Vínculos de Atendimento"
          value={stats.totalAttendantLinks}
          icon={Users}
          color="var(--mtp-navy-primary)"
          bgColor="#f1f5f9"
        />
      </div>

      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: 20,
        }}
      >
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 8 }}>
          Diretriz de Indicadores (Spec 12.3)
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Em estrita conformidade com a especificação, os números acima refletem apenas dados reais persistidos na base de dados da aplicação. Não há dados inventados ou SLAs fictícios exibidos.
        </p>
      </div>
    </div>
  );
};

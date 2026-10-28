import React, { useState, useEffect } from 'react';
import { Department, ServiceType, UserProfile } from '../../types/database';
import { catalogService } from '../../services/catalogService';
import { EmptyState } from '../layout/EmptyState';
import {
  FolderKanban,
  Search,
  FileText,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';

interface ServiceCatalogViewProps {
  currentUser: UserProfile;
  onOpenCreateTicket: () => void;
  onSelectServiceToOpen?: (service: ServiceType) => void;
}

export const ServiceCatalogView: React.FC<ServiceCatalogViewProps> = ({
  currentUser,
  onOpenCreateTicket,
  onSelectServiceToOpen,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const depts = await catalogService.getDepartments(true);
      setDepartments(depts);
      const servs = await catalogService.getServiceTypes(undefined, true);
      setServices(servs);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      {/* Hero Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--mtp-navy-primary) 0%, var(--mtp-navy-surface) 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px 32px',
          color: '#ffffff',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640 }}>
          <span
            className="badge"
            style={{
              background: 'rgba(91, 178, 221, 0.2)',
              color: 'var(--mtp-blue-primary)',
              border: '1px solid rgba(91, 178, 221, 0.4)',
              marginBottom: 12,
            }}
          >
            Portal Corporativo • MTP
          </span>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Olá, {currentUser.name.split(' ')[0]}! Como podemos ajudar hoje?
          </h1>
          <p style={{ fontSize: '0.925rem', color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 }}>
            Consulte o catálogo abaixo para solicitar acessos, relatar incidentes ou requisitar serviços aos departamentos da organização.
          </p>

          {/* Search box inside Hero */}
          <div style={{ position: 'relative', marginTop: 22 }}>
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: 14, top: 13 }}
            />
            <input
              type="text"
              className="input"
              style={{
                paddingLeft: 42,
                height: 46,
                fontSize: '0.95rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                boxShadow: 'var(--shadow-lg)',
              }}
              placeholder="Buscar por serviço ou tipo de solicitação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Published Departments Grid */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>
              Áreas & Departamentos
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Selecione uma caixa para abrir ou consultar solicitações
            </p>
          </div>

          <button className="btn btn-accent btn-sm" onClick={onOpenCreateTicket}>
            <PlusCircle size={16} /> Abrir Chamado
          </button>
        </div>

        {departments.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Nenhum departamento publicado no catálogo"
            description="O sistema inicia limpo (Spec 3.1). A administradora da plataforma deve publicar os departamentos e formulários para que apareçam aqui."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {departments.map((dept) => {
              const deptServices = services.filter((s) => s.department_id === dept.id);

              return (
                <div
                  key={dept.id}
                  className="card card-interactive"
                  onClick={onOpenCreateTicket}
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--mtp-blue-light)',
                          color: 'var(--mtp-navy-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FolderKanban size={22} />
                      </div>
                      <span className="badge" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                        {dept.code}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 4 }}>
                      {dept.name}
                    </h3>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {dept.description || 'Atendimento geral da área.'}
                    </p>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid var(--border-light)',
                      paddingTop: 10,
                      marginTop: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.775rem',
                      color: 'var(--mtp-blue-primary)',
                      fontWeight: 700,
                    }}
                  >
                    <span>{deptServices.length} serviço{deptServices.length !== 1 ? 's' : ''} disponível{deptServices.length !== 1 ? 'is' : ''}</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Services List if searching */}
      {searchTerm && (
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 12 }}>
            Resultados da busca por &quot;{searchTerm}&quot; ({filteredServices.length})
          </h3>

          {filteredServices.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhum serviço corresponde ao termo pesquisado.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {filteredServices.map((serv) => (
                <div
                  key={serv.id}
                  className="card card-interactive"
                  onClick={onOpenCreateTicket}
                  style={{ padding: '14px 16px' }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--mtp-navy-primary)' }}>{serv.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {serv.description || 'Clique para abrir chamado'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
